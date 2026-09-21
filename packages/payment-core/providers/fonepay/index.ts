/**
 * Checkout by Fonepay — a dynamic QR on a desktop, the customer's banking app
 * on a phone. Built from the bank's "Checkout Intent Flow" v1.10
 * (docs/fonepay/) and checked against its dev gateway on 2026-09-21.
 *
 * The six questions the old stub refused to guess at, answered:
 *
 *   1. Initiation — `POST /generate-intent-qr` returns an EMVCo string
 *      (`qrMessage`, byte-identical to `qrString`) that is both the QR and the
 *      deep-link payload. There is no redirect. Asked for as `DYNAMIC_QR`,
 *      not the documented `INTENT_QR` — see `initiate()`.
 *   2. Signature — see `./client.ts`.
 *   3. Confirmation — Fonepay pushes over a WebSocket to the customer's
 *      browser, unsigned, so it proves nothing. The status API over our own
 *      authenticated connection is the only thing that decides: `poll()`.
 *   4. The QR — Fonepay builds it, CRC included. We only draw it.
 *   5. Amounts — rupees as decimals, both ways.
 *   6. Fees — not reported per transaction, so zero here, never estimated.
 */
import { randomBytes } from 'node:crypto';

import type { PaymentSession, Transaction } from '@softmato/db';

import { PaymentError } from '../../errors';
import {
  requireCredential,
  resolveBaseUrl,
  type ProviderEnv,
} from '../credentials';
import { decimalFromMinor, minorFromDecimal } from '../money';
import { mapProviderStatus, type StatusMap } from '../status';
import type {
  BankApp,
  InitiateResult,
  ProviderAdapter,
  VerifiedResult,
} from '../types';
import { FonepayClient } from './client';

const HOSTS: Record<ProviderEnv, string> = {
  sandbox:
    'https://dev-external-gateway-new.fonepay.com/merchantThirdparty/api/merchant/third-party/v2',
  // Issued by the bank with our merchant credentials (2026-09-21).
  live: 'https://thirdparty-merchantapi.fonepay.com/api/merchant/third-party/v2',
};

/**
 * The doc lists `success`, `pending` and `failed`. The dev gateway also
 * answers `timeout`, with `paymentMessage: "Data not found."`, for a QR that
 * was generated seconds earlier and never scanned — so it means "nobody has
 * paid this yet", not "this can no longer be paid". Mapping it to `expired`
 * would close an attempt the customer may be paying at that moment; the
 * session's own expiry is what ends an abandoned one.
 */
const STATUS: StatusMap = {
  success: 'succeeded',
  pending: 'pending',
  timeout: 'pending',
  failed: 'failed',
};

export interface FonepayConfig {
  username?: string;
  password?: string;
  terminalId?: string;
  privateKey?: string;
  baseUrl?: string;
  env?: ProviderEnv;
}

interface StatusReply {
  paymentStatus?: string;
  totalTransactionAmount?: string | number;
  fonepayTraceId?: number | string | null;
}

interface BankReply {
  bankDetails?: {
    bankName?: unknown;
    bankIcon?: unknown;
    intentScheme?: unknown;
  }[];
}

export class FonepayProviderAdapter implements ProviderAdapter {
  readonly id = 'fonepay' as const;

  private readonly client: FonepayClient;
  private readonly terminalId: string;

  constructor(config: FonepayConfig) {
    const env = config.env ?? 'sandbox';
    const need = (name: string, value: string | undefined) =>
      requireCredential(
        'fonepay',
        `FONEPAY_${env === 'live' ? 'LIVE_' : ''}${name}`,
        value,
      );

    this.terminalId = need('TERMINAL_ID', config.terminalId);
    this.client = new FonepayClient({
      baseUrl: resolveBaseUrl(env, HOSTS, config.baseUrl),
      username: need('USERNAME', config.username),
      password: need('PASSWORD', config.password),
      privateKey: need('PRIVATE_KEY', config.privateKey),
    });
  }

  async initiate(session: PaymentSession, invoiceNo: string): Promise<InitiateResult> {
    /*
     * Fonepay's rules: unique per transaction, alphanumeric, at most 30
     * characters. Not the session id — that is a bearer token for the
     * checkout page, and this label is printed into the QR and kept in the
     * bank's records.
     */
    const referenceLabel = randomBytes(12).toString('hex');

    const [qr, banks] = await Promise.all([
      this.client.call<{ qrMessage?: string; websocketId?: string }>(
        'POST',
        '/generate-intent-qr',
        {
          // `Number` of an exact two-place decimal prints back exactly.
          amount: Number(decimalFromMinor(session.amountMinor)),
          /*
           * The payer's banking app shows it as the payment's remark, so it
           * is the number on their invoice. 18 characters, inside the QR's
           * 25-character bill field.
           */
          billId: invoiceNo,
          terminalId: this.terminalId,
          paymentMode: 'QR',
          referenceLabel,
          /*
           * Not the documented `INTENT_QR`. On production (2026-09-21) eSewa
           * and every bank app we tried answered an INTENT_QR scan with
           * "internal server error": it carries two intent-only fields
           * (`26-11 = 15` and a `62-10` token) their scanners reject.
           * `DYNAMIC_QR` drops both; it scanned, paid (NPR 1, Fonepay trace
           * 1296830344) and the status API reported `success`.
           */
          qrType: 'DYNAMIC_QR',
        },
      ),
      /*
       * Display only: without it a phone still gets the QR, which any banking
       * app can read from a screenshot. Not worth failing a payment over.
       */
      this.client
        .call<BankReply>('GET', '/banks/list', undefined, {
          paymentMode: 'INTENT',
        })
        .catch((): BankReply => ({})),
    ]);

    if (!qr.qrMessage) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Fonepay accepted the request but returned no qrMessage',
        { sessionId: session.id },
      );
    }

    return {
      providerRef: referenceLabel,
      qrPayload: qr.qrMessage,
      ...(qr.websocketId ? { socketUrl: qr.websocketId } : {}),
      bankApps: bankApps(banks, qr.qrMessage),
    };
  }

  async poll(txn: Transaction): Promise<VerifiedResult> {
    const referenceLabel = txn.providerRef;

    if (!referenceLabel) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Missing providerRef (referenceLabel) for Fonepay status',
        { txnNo: txn.txnNo },
      );
    }

    const data = await this.client.call<StatusReply>(
      'POST',
      '/thirdPartyDynamicQrGetStatus',
      { terminalId: this.terminalId, referenceLabel },
    );

    if (data.totalTransactionAmount === undefined) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Fonepay status returned no totalTransactionAmount',
        { txnNo: txn.txnNo, referenceLabel },
      );
    }

    return {
      status: mapProviderStatus('fonepay', STATUS, data.paymentStatus),
      /*
       * What was paid, not what we asked for: a disagreement is exactly what
       * `completePayment` exists to catch, and `requestedAmount` would echo
       * our own number back and hide it.
       */
      grossAmountMinor: minorFromDecimal(data.totalTransactionAmount),
      providerFeeMinor: 0n,
      ...(data.fonepayTraceId != null
        ? { providerTxnId: String(data.fonepayTraceId) }
        : {}),
      raw: data,
    };
  }
}

/**
 * The deep link is the doc's `<scheme>://payment/?qrPayload=<qr>`. Schemes
 * arrive with and without a trailing slash, so it is normalised. Icons are
 * kept only when absolute: the dev gateway returns bare relative paths.
 */
function bankApps(reply: BankReply, qrPayload: string): BankApp[] {
  const apps: BankApp[] = [];

  for (const bank of reply.bankDetails ?? []) {
    const { bankName: name, bankIcon: icon, intentScheme: scheme } = bank;

    if (typeof name !== 'string' || typeof scheme !== 'string') continue;

    apps.push({
      name,
      deeplink: `${scheme.replace(/\/+$/, '')}/?qrPayload=${encodeURIComponent(qrPayload)}`,
      ...(typeof icon === 'string' && /^https:\/\//.test(icon) ? { icon } : {}),
    });
  }

  return apps;
}

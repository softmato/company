/**
 * Khalti ePayment v2.
 *
 * Testable in sandbox out of the box: Khalti publishes a shared test secret
 * key in its own integration examples, and `.env.example` carries it. A
 * merchant-specific sandbox key from `test-admin.khalti.com` works the same
 * way. With `KHALTI_SECRET_KEY` unset this adapter throws on construction and
 * the composition root simply does not register it — see `./credentials.ts`.
 *
 * Note Khalti calls the sandbox key `live_secret_key` as well. That is Khalti's
 * naming, not a mistake here, and not a live credential.
 *
 * **Khalti never pushes.** There is no webhook and no callback to verify; the
 * customer is returned to a URL carrying query parameters, and those
 * parameters are a claim by whoever's browser made the request, not by Khalti.
 * The only thing that decides a Khalti payment is `poll()`, which asks Khalti
 * directly. So this adapter deliberately does **not** implement
 * `handleCallback` — the return handler looks the transaction up and calls
 * `poll()` with the real row.
 *
 * That absence replaces something worth describing, because it is the shape
 * the defect took: the old `handleCallback` fabricated a transaction —
 * `{ providerRef: pidx, grossAmountMinor: 0n } as unknown as Transaction` —
 * and passed it to `poll()`. In the credential-less branch that returned
 * `succeeded` for `0n`; with a key it returned a real amount attached to a row
 * that did not exist. Neither is a thing to build settlement on, and casting
 * through `unknown` was the compiler saying so.
 */
import type { PaymentSession, Transaction } from '@softmato/db';

import { PaymentError } from '../errors';
import {
  requireCredential,
  resolveBaseUrl,
  resolveEnv,
  type ProviderEnv,
} from './credentials';
import { minorFromInteger } from './money';
import { mapProviderStatus, type StatusMap } from './status';
import type { InitiateResult, ProviderAdapter, VerifiedResult } from './types';

/**
 * `dev.khalti.com` is the sandbox host Khalti's current documentation names.
 * The older `a.khalti.com` still answers identically (verified 2026-09-02:
 * both return a pidx and a `test-pay.khalti.com` payment_url for the same
 * key), but the documented host is the one to depend on — an undocumented
 * alias that works today is a host that can be retired without notice.
 */
const HOSTS: Record<ProviderEnv, string> = {
  sandbox: 'https://dev.khalti.com/api/v2',
  live: 'https://khalti.com/api/v2',
};

/**
 * `Initiated` is mapped to `pending` rather than treated as a start state:
 * from our side an initiated payment is one we must keep asking about, which
 * is what `pending` means. Everything else is Khalti's own vocabulary.
 */
const STATUS: StatusMap = {
  Completed: 'succeeded',
  Pending: 'pending',
  Initiated: 'pending',
  Expired: 'expired',
  'User canceled': 'cancelled',
  Failed: 'failed',
  Refunded: 'refunded',
  'Partially Refunded': 'refunded',
};

export interface KhaltiConfig {
  secretKey?: string;
  baseUrl?: string;
  env?: ProviderEnv;
}

export class KhaltiProviderAdapter implements ProviderAdapter {
  readonly id = 'khalti' as const;

  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: KhaltiConfig = {}) {
    const env = config.env ?? resolveEnv(process.env.KHALTI_ENV);

    this.secretKey = requireCredential(
      'khalti',
      'KHALTI_SECRET_KEY',
      config.secretKey ?? process.env.KHALTI_SECRET_KEY,
    );
    this.baseUrl = resolveBaseUrl(
      env,
      HOSTS,
      config.baseUrl ?? process.env.KHALTI_BASE_URL,
    );
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const data = await this.post<{ pidx?: string; payment_url?: string }>(
      '/epayment/initiate/',
      {
        return_url: callbackUrl(session),
        website_url: websiteUrl(),
        // Khalti works in paisa, which is already our minor unit.
        amount: Number(session.amountMinor),
        purchase_order_id: session.id,
        purchase_order_name: `Invoice ${session.invoiceId}`,
      },
    );

    if (!data.pidx || !data.payment_url) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Khalti accepted the initiation but returned no pidx or payment_url',
        { sessionId: session.id },
      );
    }

    return {
      providerRef: data.pidx,
      redirectUrl: data.payment_url,
      correlationId: data.pidx,
    };
  }

  async poll(txn: Transaction): Promise<VerifiedResult> {
    const pidx = txn.providerRef;

    if (!pidx) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Missing providerRef (pidx) for Khalti lookup',
        { txnNo: txn.txnNo },
      );
    }

    const data = await this.post<{
      status?: string;
      total_amount?: number;
      transaction_id?: string;
      fee?: number;
    }>('/epayment/lookup/', { pidx });

    if (data.total_amount === undefined) {
      throw new PaymentError(
        'PROVIDER_UNAVAILABLE',
        'Khalti lookup returned no total_amount',
        { txnNo: txn.txnNo, pidx },
      );
    }

    return {
      status: mapProviderStatus('khalti', STATUS, data.status),
      grossAmountMinor: minorFromInteger(data.total_amount),
      /*
       * Khalti's own `fee`, taken verbatim. Absent means zero because Khalti
       * omits the field before settlement, not because we are estimating —
       * a computed percentage here would be a RULES.md §2.7 violation.
       */
      providerFeeMinor:
        data.fee === undefined ? 0n : minorFromInteger(data.fee),
      ...(data.transaction_id ? { providerTxnId: data.transaction_id } : {}),
      raw: data,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${this.secretKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Could not reach Khalti', {
        path,
        error: String(error),
      });
    }

    const text = await response.text();
    const parsed = parseJson(text);

    if (!response.ok) {
      /*
       * **Khalti answers a cancelled payment with HTTP 400.** The body is a
       * complete, correct lookup result:
       *
       *   {"pidx":"…","total_amount":10000,"status":"User canceled",
       *    "transaction_id":null,"fee":0,"error_key":"khalti_error"}
       *
       * Treating every non-2xx as a transport failure turned the most ordinary
       * outcome in payments — the customer changed their mind — into a thrown
       * `PROVIDER_UNAVAILABLE`, which reached the customer as a 500 page
       * reading "Something broke on our side". It also meant
       * `poll-pending-transactions` threw on that row on every run, spending
       * its attempts and finally handing a human a cancelled payment to
       * investigate.
       *
       * So a status code is not the answer here; the body is. A non-2xx that
       * carries a status we already know how to map is a real result and is
       * returned as one.
       */
      if (isLookupAnswer(parsed)) return parsed as T;

      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Khalti rejected the request', {
        path,
        status: response.status,
        // Truncated: Khalti echoes merchant identifiers in some errors, and
        // this reaches the log, not the client.
        body: text.slice(0, 500),
      });
    }

    return parsed as T;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Whether an error-coded response is really a lookup result.
 *
 * Deliberately narrow: only a `status` string **we already have a mapping
 * for** counts. An unrecognised status still throws rather than being guessed
 * at (§0.5), and the responses that are genuinely failures carry no `status`
 * at all — a bad key gives `{"detail":"Invalid token."}`, an unknown pidx
 * gives `{"detail":"Not found.","error_key":"validation_error"}` — so both
 * keep raising, which is what they should do.
 */
function isLookupAnswer(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;

  const status = (parsed as { status?: unknown }).status;

  return typeof status === 'string' && status in STATUS;
}

function websiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ??
    'http://localhost:3000'
  );
}

function callbackUrl(session: PaymentSession): string {
  const base =
    process.env.NEXT_PUBLIC_CHECKOUT_URL?.replace(/\/+$/, '') ??
    'http://payment.localhost:3000';

  return `${base}/checkout/${session.id}/callback`;
}

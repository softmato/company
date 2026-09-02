/**
 * eSewa ePay v2.
 *
 * eSewa publishes its sandbox credentials (`EPAYTEST` / `8gBm/:&EnhH.1/q`), so
 * this adapter can complete a real payment against `rc-epay.esewa.com.np`
 * without waiting for a merchant account. It is the reference implementation —
 * Khalti follows its shape, and Fonepay will when the bank's document arrives.
 *
 * **The secret key above is not the one this repo recorded until 2026-09-02.**
 * `.env.example`, this docstring and the tests all carried `8gBwcE4DOHB28vvi`,
 * which is not an eSewa key: posting the v2 form signed with it returns
 * `{"code":"ES104","message":"Invalid payload signature."}`, so every sandbox
 * attempt would have failed at the door with an error that reads like a bug in
 * the signing code rather than a wrong key. `tests/esewa-signature.test.ts`
 * now pins the real key to a known signature so this cannot drift back.
 *
 * Four things the previous version got wrong, all of which would have shown up
 * on the first sandbox attempt or, worse, not shown up at all:
 *
 *   * **The response signature was never checked.** See `signature.ts`.
 *   * **Payment was a `GET` redirect.** ePay v2 is a form POST; the query
 *     string version is not a request eSewa answers.
 *   * **`transaction_uuid` contained an underscore** (`${id}_${Date.now()}`).
 *     eSewa accepts alphanumerics and hyphens, so every call would have been
 *     rejected at the door.
 *   * **Amounts went through `parseFloat`**, which reads eSewa's own
 *     `"1,000.0"` as `1`. See `../money.ts`.
 *
 * `refund()` is deliberately absent. It is optional on `ProviderAdapter`, and
 * the previous implementation returned `status: 'succeeded'` without
 * contacting eSewa at all — a lie that would post reversing entries for money
 * that never went back. An absent method is honest; a fake one is not.
 */
import type { PaymentSession, Transaction } from '@softmato/db';

import { PaymentError } from '../../errors';
import {
  requireCredential,
  resolveBaseUrl,
  resolveEnv,
  type ProviderEnv,
} from '../credentials';
import { decimalFromMinor, minorFromDecimal } from '../money';
import { mapProviderStatus, type StatusMap } from '../status';
import type { InitiateResult, ProviderAdapter, VerifiedResult } from '../types';
import {
  assertSignature,
  REQUEST_SIGNED_FIELDS,
  baseString,
  sign,
} from './signature';

const HOSTS: Record<ProviderEnv, string> = {
  sandbox: 'https://rc-epay.esewa.com.np',
  live: 'https://epay.esewa.com.np',
};

/**
 * Every status eSewa documents, mapped deliberately.
 *
 * `NOT_FOUND` and `AMBIGUOUS` are the two that matter and the two the old
 * `|| 'pending'` default swallowed. `AMBIGUOUS` means eSewa itself does not
 * know the outcome — the one case where taking either answer is wrong — so it
 * goes to a human rather than to the ledger.
 */
const STATUS: StatusMap = {
  COMPLETE: 'succeeded',
  PENDING: 'pending',
  CANCELED: 'cancelled',
  NOT_FOUND: 'failed',
  FULL_REFUND: 'refunded',
  PARTIAL_REFUND: 'refunded',
};

export interface EsewaConfig {
  merchantCode?: string;
  secretKey?: string;
  baseUrl?: string;
  env?: ProviderEnv;
}

export class EsewaProviderAdapter implements ProviderAdapter {
  readonly id = 'esewa' as const;

  private readonly merchantCode: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: EsewaConfig = {}) {
    const env = config.env ?? resolveEnv(process.env.ESEWA_ENV);

    // Both throw when absent. There is no sandbox-key fallback: signing live
    // payments with eSewa's published test secret is not a degraded mode, it
    // is a compromise that verifies.
    this.merchantCode = requireCredential(
      'esewa',
      'ESEWA_MERCHANT_CODE',
      config.merchantCode ?? process.env.ESEWA_MERCHANT_CODE,
    );
    this.secretKey = requireCredential(
      'esewa',
      'ESEWA_SECRET_KEY',
      config.secretKey ?? process.env.ESEWA_SECRET_KEY,
    );
    this.baseUrl = resolveBaseUrl(
      env,
      HOSTS,
      config.baseUrl ?? process.env.ESEWA_BASE_URL,
    );
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const total = decimalFromMinor(session.amountMinor);
    const transactionUuid = transactionUuidFor(session);

    /*
     * The signed values and the submitted values are the same objects, built
     * once. Building them twice is how a signature ends up covering a string
     * the form does not send — the failure mode being a signature that is
     * correct for something nobody transmitted.
     */
    const signed: Record<string, string> = {
      total_amount: total,
      transaction_uuid: transactionUuid,
      product_code: this.merchantCode,
    };

    const returnUrl = callbackUrl(session);

    const fields: Record<string, string> = {
      ...signed,
      amount: total,
      tax_amount: '0',
      product_service_charge: '0',
      product_delivery_charge: '0',
      // eSewa appends its own `data` parameter to whichever of these it uses.
      success_url: returnUrl,
      failure_url: returnUrl,
      signed_field_names: REQUEST_SIGNED_FIELDS.join(','),
      signature: sign(
        this.secretKey,
        baseString(REQUEST_SIGNED_FIELDS, signed),
      ),
    };

    return {
      providerRef: transactionUuid,
      formPost: { url: `${this.baseUrl}/api/epay/main/v2/form`, fields },
      correlationId: transactionUuid,
    };
  }

  /**
   * The status API, and the only thing that ever decides a payment.
   *
   * Note it re-derives the amount from **our** transaction rather than from
   * anything a browser sent. Whatever eSewa reports is compared against that
   * by `completePayment`; this method's job is to fetch an answer, not to
   * agree with one.
   */
  async poll(txn: Transaction): Promise<VerifiedResult> {
    const uuid = txn.providerRef;

    if (!uuid) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Missing providerRef (transaction_uuid) for eSewa lookup',
        { txnNo: txn.txnNo },
      );
    }

    const query = new URLSearchParams({
      product_code: this.merchantCode,
      total_amount: decimalFromMinor(txn.grossAmountMinor),
      transaction_uuid: uuid,
    });

    const data = await this.get<{
      status?: string;
      ref_id?: string;
      total_amount?: string | number;
    }>(`/api/epay/transaction/status/?${query}`);

    return {
      status: mapProviderStatus('esewa', STATUS, data.status),
      grossAmountMinor:
        data.total_amount === undefined
          ? txn.grossAmountMinor
          : minorFromDecimal(data.total_amount),
      // eSewa does not report a per-transaction fee. Zero is the truth here,
      // not a placeholder — never a computed percentage (RULES.md §2.7).
      providerFeeMinor: 0n,
      ...(data.ref_id ? { providerTxnId: data.ref_id } : {}),
      raw: data,
    };
  }

  /**
   * The signed payload eSewa hands back on its return URL.
   *
   * Verified first, and read only afterwards. The order is the whole point:
   * every field below is attacker-supplied until `assertSignature` has run.
   *
   * **Nothing outside tests calls this yet, and that is deliberate — it is
   * Phase 5's, written early.** `PHASES.md` Phase 5 asks for a callback
   * handler that verifies, persists and answers in under 200ms, with a
   * five-minute fallback to the status check; this method is the "verifies"
   * half of it. Phase 3 settles by `poll()` alone, which is the safe subset:
   * one round trip slower, one settlement authority, correct.
   *
   * It was proposed for deletion as dead code on a money path. Keeping it was
   * the call (todo.md §8.1) — deleting it would remove the only
   * implementation of Phase 5 acceptance 2 and make acceptance 5 unreachable,
   * since a round trip to eSewa cannot answer in under 200ms.
   *
   * **The rule for whoever wires this up:** the callback may settle, but a
   * later poll that disagrees is the one that stands. eSewa names its status
   * API the authority and does not guarantee this redirect arrives at all —
   * hence the five-minute fallback, and hence `poll()` staying mandatory
   * whatever happens here.
   */
  async handleCallback(raw: unknown): Promise<VerifiedResult> {
    const payload = decodeResponse(raw);

    assertSignature(this.secretKey, payload);

    return {
      status: mapProviderStatus('esewa', STATUS, payload.status),
      grossAmountMinor: minorFromDecimal(
        payload.total_amount ??
          missing('total_amount', payload.transaction_uuid),
      ),
      providerFeeMinor: 0n,
      ...(payload.transaction_code
        ? { providerTxnId: payload.transaction_code }
        : {}),
      raw: payload,
    };
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Could not reach eSewa', {
        error: String(error),
      });
    }

    if (!response.ok) {
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'eSewa lookup failed', {
        status: response.status,
        body: (await response.text()).slice(0, 500),
      });
    }

    return (await response.json()) as T;
  }
}

/**
 * eSewa accepts alphanumerics and hyphens in `transaction_uuid`. The session
 * id is already unique and already that shape apart from its underscore, so
 * the id carries the uniqueness and nothing is appended.
 *
 * Nothing time-based, deliberately. `${id}_${Date.now()}` minted a new
 * reference on every call, and `startPayment` stores exactly one — a second
 * initiate would have left eSewa holding an intent under a reference we had no
 * record of and would never poll.
 */
function transactionUuidFor(session: PaymentSession): string {
  return session.id.replace(/[^a-zA-Z0-9-]/g, '-');
}

function callbackUrl(session: PaymentSession): string {
  const base =
    process.env.NEXT_PUBLIC_CHECKOUT_URL?.replace(/\/+$/, '') ??
    'http://payment.localhost:3000';

  // Not `session.returnUrl` — that is the merchant's page, where the customer
  // is sent after we have settled. eSewa must come back to us first.
  return `${base}/checkout/${session.id}/callback`;
}

/**
 * eSewa returns its response as base64 JSON under `data`, either as a query
 * parameter on the return URL or as a form field.
 */
function decodeResponse(raw: unknown): Record<string, string> {
  const outer = (raw ?? {}) as Record<string, unknown>;
  const encoded = outer.data;

  if (typeof encoded !== 'string' || !encoded) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'eSewa callback carries no data payload',
      {},
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (error) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'eSewa callback payload is not base64 JSON',
      { error: String(error) },
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'eSewa callback payload is not an object',
      {},
    );
  }

  /*
   * Flattened to strings before verification, because the signature is over
   * text. A number here would stringify differently than eSewa signed it
   * (`100.0` → `100`) and fail verification for a payload that was genuine.
   */
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : String(value),
    ]),
  );
}

function missing(field: string, uuid: string | undefined): never {
  throw new PaymentError(
    'VALIDATION_FAILED',
    `eSewa callback verified but carries no ${field}`,
    { transactionUuid: uuid ?? null },
  );
}

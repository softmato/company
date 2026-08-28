/**
 * The provider adapter interface (docs/API.md §5).
 *
 * Naming note: API.md calls this interface `PaymentProvider`. `@softmato/db`
 * already exports that name for the `payment_providers` **row**, and the two
 * are different things — one is configuration, one is behaviour. The interface
 * is `ProviderAdapter` here. Recorded in MEMORY.md under deviations.
 *
 * `poll()` is not optional. It is the universal safety net: a suppressed
 * callback, a customer who closed the tab, a provider that never pushes at all
 * (Khalti) — all of them are recovered by polling and nothing else.
 *
 * **Every payment now goes through a gateway.** The `manual_qr` provider — a
 * customer transferring by bank QR and uploading a screenshot for an admin to
 * approve — was removed on 2026-08-16, reversing the 2026-08-12 decision that
 * made it first-class. There is no longer any path that credits a payment on
 * human say-so, which also means there is no fallback when a gateway is down.
 */
import type { PaymentSession, Transaction } from '@softmato/db';

/**
 * Ordered by preference: Fonepay is the primary full-merchant integration,
 * eSewa and Khalti are the secondary wallets. The order here is documentation;
 * what a customer is actually offered comes from `sort_order` and the
 * amount-based routing in docs/API.md §8.
 */
export const PROVIDER_IDS = ['fonepay', 'esewa', 'khalti'] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export interface InitiateResult {
  /** Khalti: pidx. eSewa: booking_id. Fonepay: per the bank's spec. */
  providerRef: string;
  redirectUrl?: string;
  deeplink?: string;
  qrPayload?: string;
  correlationId?: string;
}

/**
 * The subset of a provider's answer we are prepared to believe. Everything
 * else stays in `raw`, which is stored verbatim on `provider_events`.
 */
export type VerifiedStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface VerifiedResult {
  status: VerifiedStatus;
  grossAmountMinor: bigint;
  /** Taken from the provider. Never computed as a percentage (RULES.md §2.7). */
  providerFeeMinor: bigint;
  providerTxnId?: string;
  /** The untouched provider payload, for the audit trail. */
  raw: unknown;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'pending' | 'succeeded' | 'failed';
  raw: unknown;
}

export interface ProviderAdapter {
  readonly id: ProviderId;

  initiate(session: PaymentSession): Promise<InitiateResult>;

  /** Only for providers that actually push. Verify the signature first. */
  handleCallback?(raw: unknown, headers: Headers): Promise<VerifiedResult>;

  /** Mandatory for every provider. */
  poll(txn: Transaction): Promise<VerifiedResult>;

  cancel?(txn: Transaction): Promise<void>;

  refund?(txn: Transaction, amountMinor: bigint): Promise<RefundResult>;
}

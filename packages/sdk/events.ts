/**
 * The events you can receive, and the body they arrive in.
 *
 * Mirrors `payment-core/webhooks/events.ts` and is duplicated for the same
 * reason the signature check is: a consumer must not install the server
 * package to type an event handler. These are types plus one frozen array —
 * there is no logic here to drift.
 */

/** docs/API.md §4. */
export const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.pending',
  'payment.success',
  'payment.failed',
  'payment.cancelled',
  'payment.expired',
  'payment.refund_created',
  'payment.refunded',
  'payment.partially_refunded',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookPayload {
  event: WebhookEvent;
  transaction_id: string;
  invoice_id: string;
  /** Paisa. `1200000` is NPR 12,000. */
  amount: number;
  currency: string;
  status: string;
  occurred_at: string;
}

/**
 * Note what is **not** here: there is no event for a payment held for
 * reconciliation. A mismatch between us and a provider is ours to resolve, and
 * you are told when it does — telling you `payment.failed` would be untrue and
 * `payment.success` would be worse.
 */
export function isWebhookEvent(value: unknown): value is WebhookEvent {
  return (
    typeof value === 'string' &&
    (WEBHOOK_EVENTS as readonly string[]).includes(value)
  );
}

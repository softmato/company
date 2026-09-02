/**
 * What a SaaS is told, and in what shape.
 *
 * The event list and the body are docs/API.md §4 and are a **published
 * contract**: somebody else's code branches on these strings and reads these
 * keys. So the payload is built here, once, from a transaction — never
 * assembled ad hoc at a call site where a field could quietly change name.
 *
 * `snake_case` throughout and amounts as plain integers in minor units, both
 * because that is what §4 documents. `amount` is a `number` rather than a
 * `bigint` because this becomes JSON, and `JSON.stringify` throws on a
 * `bigint` — the conversion is done deliberately here rather than discovered
 * at delivery time.
 */
import type { Transaction } from '@softmato/db';

/** Every event a consumer may receive. docs/API.md §4. */
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

export interface WebhookPayload extends Record<string, unknown> {
  event: WebhookEvent;
  transaction_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  occurred_at: string;
}

/**
 * A transaction status → the event a consumer is told about it.
 *
 * `reconciliation_required` is deliberately absent, and that absence is a
 * decision worth stating: a held payment is an internal matter between us and
 * a provider, and telling a SaaS "payment.failed" would be a lie while telling
 * them "payment.success" would be worse. They are told when it resolves.
 */
const EVENT_BY_STATUS: Partial<Record<string, WebhookEvent>> = {
  created: 'payment.created',
  pending: 'payment.pending',
  succeeded: 'payment.success',
  failed: 'payment.failed',
  cancelled: 'payment.cancelled',
  expired: 'payment.expired',
  refunded: 'payment.refunded',
  partially_refunded: 'payment.partially_refunded',
};

export function eventForStatus(status: string): WebhookEvent | null {
  return EVENT_BY_STATUS[status] ?? null;
}

export function buildPayload(
  event: WebhookEvent,
  transaction: Transaction,
  invoiceNo: string,
  occurredAt: Date,
): WebhookPayload {
  return {
    event,
    transaction_id: transaction.txnNo,
    invoice_id: invoiceNo,
    /*
     * Safe: NPR amounts in paisa stay far below `Number.MAX_SAFE_INTEGER`
     * (about 90 trillion rupees), and the field is documented as a JSON
     * number. `bigint` would throw in `JSON.stringify`.
     */
    amount: Number(transaction.grossAmountMinor),
    currency: transaction.currency,
    status: transaction.status.toUpperCase(),
    occurred_at: occurredAt.toISOString(),
  };
}

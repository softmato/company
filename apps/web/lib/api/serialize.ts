import 'server-only';
import type { Invoice, PaymentSession } from '@softmato/db';
import type { FiledRefund, TransactionView } from '@softmato/payment-core';

/**
 * Database rows → API bodies (docs/API.md §1).
 *
 * Two conversions happen here and nowhere else, which is the point of the
 * file: `bigint` becomes a JSON number of paisa, and `Date` becomes ISO 8601
 * UTC. `JSON.stringify` throws on a bigint rather than guessing, so every
 * money field has to pass through a function like this one — and that function
 * is the place to be sure nothing internal comes with it.
 *
 * Nothing here emits an internal row id. A SaaS addresses an invoice by its
 * `invoice_no` and a transaction by its `txn_no`.
 */

function paisa(value: bigint): number {
  // Well inside Number.MAX_SAFE_INTEGER: 9e15 paisa is NPR 90 trillion.
  return Number(value);
}

export function serializeInvoice(invoice: Invoice) {
  return {
    invoice_id: invoice.invoiceNo,
    external_ref: invoice.externalRef,
    status: invoice.status,
    currency: invoice.currency,
    subtotal_minor: paisa(invoice.subtotalMinor),
    total_minor: paisa(invoice.totalMinor),
    paid_minor: paisa(invoice.paidMinor),
    service_starts_at: invoice.serviceStartsAt?.toISOString() ?? null,
    service_ends_at: invoice.serviceEndsAt?.toISOString() ?? null,
    issued_at: invoice.issuedAt?.toISOString() ?? null,
    due_at: invoice.dueAt?.toISOString() ?? null,
  };
}

export function serializeSession(session: PaymentSession, checkoutUrl: string) {
  return {
    session_id: session.id,
    checkout_url: checkoutUrl,
    expires_at: session.expiresAt.toISOString(),
    allowed_providers: session.allowedProviders,
    amount_minor: paisa(session.amountMinor),
    currency: session.currency,
    status: session.status,
  };
}

/**
 * The body of `GET /v1/transactions/{id}`.
 *
 * **`status` is uppercased, matching the webhook payload.** `buildPayload` in
 * `packages/payment-core/webhooks/events.ts` sends `SUCCEEDED`, so this sends
 * `SUCCEEDED` too — a consumer branching on a webhook and a consumer polling
 * this endpoint branch on the same words. Two vocabularies for one set of
 * states is a bug waiting for whoever writes the second `switch`.
 *
 * `invoice_id` is the invoice *number*, which is what the webhook's
 * `invoice_id` carries and what `POST /v1/invoices` handed back. It is not the
 * row id and there is no row id in this body.
 */
export function serializeTransactionView(txn: TransactionView) {
  return {
    transaction_id: txn.txnNo,
    invoice_id: txn.invoiceNo,
    status: txn.status.toUpperCase(),
    provider: txn.providerId,
    currency: txn.currency,
    amount_minor: paisa(txn.grossAmountMinor),
    // From the provider's own response, never a computed percentage
    // (docs/RULES.md §2.7).
    provider_fee_minor: paisa(txn.providerFeeMinor),
    net_amount_minor: paisa(txn.netAmountMinor),
    refunded_amount_minor: paisa(txn.refundedAmountMinor),
    created_at: txn.createdAt.toISOString(),
    succeeded_at: txn.succeededAt?.toISOString() ?? null,
  };
}

/**
 * The body of `POST /v1/refunds`.
 *
 * **`note` is not decoration and must not be dropped.** An integrator who
 * reads `"status": "requested"` and tells their customer the money is coming
 * has been misled by us, and the one place we can be sure they see the
 * correction is in the response they are already parsing. It says the same
 * thing `docs/API.md` §3 says, in the same words.
 */
export function serializeRefund(refund: FiledRefund) {
  return {
    refund_id: refund.refundNo,
    transaction_id: refund.txnNo,
    amount_minor: paisa(refund.amountMinor),
    currency: refund.currency,
    reason: refund.reason,
    status: refund.status,
    created_at: refund.requestedAt.toISOString(),
    note: 'This is a request, not a refund. No money has been returned. A Softmato admin must approve it before anything reaches the customer.',
  };
}

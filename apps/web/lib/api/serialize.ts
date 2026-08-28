import 'server-only';
import type { Invoice, PaymentSession, Transaction } from '@softmato/db';

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

export function serializeSession(
  session: PaymentSession,
  checkoutUrl: string,
) {
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

export function serializeTransaction(txn: Transaction) {
  return {
    transaction_id: txn.txnNo,
    status: txn.status,
    provider: txn.providerId,
    currency: txn.currency,
    amount_minor: paisa(txn.grossAmountMinor),
    // From the provider's own response, never a computed percentage
    // (docs/RULES.md §2.7).
    provider_fee_minor: paisa(txn.providerFeeMinor),
    net_amount_minor: paisa(txn.netAmountMinor),
    refunded_amount_minor: paisa(txn.refundedAmountMinor),
    initiated_at: txn.initiatedAt.toISOString(),
    succeeded_at: txn.succeededAt?.toISOString() ?? null,
  };
}

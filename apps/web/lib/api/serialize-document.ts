import 'server-only';

import type {
  InvoiceDocument,
  Party,
  ReceiptDocument,
} from '@/lib/documents/types';

/**
 * Documents → API bodies, for a SaaS listing them in its own settings screen.
 *
 * Separate from `serialize.ts` because these answer a different question. That
 * file turns an `invoices` row into the acknowledgement of a write; this turns
 * a whole *document* into something a consumer can render a billing history
 * from — lines, both parties, the amount in the plan's own words, and a URL to
 * the PDF.
 *
 * Same two conversions as its neighbour and for the same reasons: `bigint`
 * becomes a JSON number of paisa, `Date` becomes ISO 8601 UTC.
 *
 * **No internal ids, ever.** An invoice is addressed by `invoice_no` and a
 * payment by `txn_no`. `customer_id`, `application_id` and the row's own `id`
 * are ours; a consumer that learned them would be able to guess at rows that
 * are not theirs, and would build against numbers we reserve the right to
 * renumber.
 */

function paisa(value: bigint): number {
  return Number(value);
}

function party(value: Party) {
  return {
    name: value.name,
    address: value.address,
    pan: value.pan,
    email: value.email,
    phone: value.phone,
  };
}

export function serializeInvoiceDocument(
  document: InvoiceDocument,
  documentUrl: string,
) {
  return {
    object: 'invoice',
    invoice_id: document.invoiceNo,
    fiscal_year: document.fiscalYear,
    status: document.status,
    currency: document.currency,
    issued_at: document.issuedAt?.toISOString() ?? null,
    due_at: document.dueAt?.toISOString() ?? null,
    seller: party(document.seller),
    customer: party(document.customer),
    lines: document.lines.map((line) => ({
      line_no: line.lineNo,
      description: line.description,
      period_start: line.periodStart?.toISOString() ?? null,
      period_end: line.periodEnd?.toISOString() ?? null,
      quantity: line.quantity,
      unit_price_minor: paisa(line.unitPriceMinor),
      amount_minor: paisa(line.amountMinor),
    })),
    subtotal_minor: paisa(document.subtotalMinor),
    discount_minor: paisa(document.discountMinor),
    total_minor: paisa(document.totalMinor),
    paid_minor: paisa(document.paidMinor),
    due_minor: paisa(document.dueMinor),
    /*
     * Echoed back exactly as it was sent. A consumer rendering its own billing
     * screen should not have to keep a second copy of the plan copy it already
     * gave us — and if it does keep one, this is what it reconciles against.
     */
    presentation: document.presentation,
    /** `?format=pdf` on this URL returns the PDF; without it, this JSON. */
    document_url: documentUrl,
  };
}

export function serializeReceiptDocument(
  document: ReceiptDocument,
  documentUrl: string,
) {
  return {
    object: 'receipt',
    receipt_id: document.receiptNo,
    invoice_id: document.invoiceNo,
    fiscal_year: document.fiscalYear,
    currency: document.currency,
    amount_minor: paisa(document.amountMinor),
    /** The gateway's own reference, for the payer's own reconciliation. */
    provider: document.providerName,
    provider_ref: document.providerRef,
    paid_at: document.paidAt.toISOString(),
    seller: party(document.seller),
    customer: party(document.customer),
    invoice_total_minor: paisa(document.invoiceTotalMinor),
    total_received_minor: paisa(document.totalReceivedMinor),
    balance_due_minor: paisa(document.balanceDueMinor),
    document_url: documentUrl,
  };
}

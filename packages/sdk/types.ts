/**
 * The wire shapes, exactly as docs/API.md §3 documents them.
 *
 * `snake_case` because that is what crosses the wire; converting to camelCase
 * would mean a consumer reading our docs and our types side by side has to
 * translate every field name, and the first thing they would get wrong is the
 * one the docs are clearest about.
 *
 * **Every amount is an integer in paisa.** `500000` is NPR 5,000. There are no
 * decimals anywhere in this API, and a `number` here is never rupees.
 */

export interface CustomerInput {
  external_ref: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  /** Paisa. */
  unit_price_minor: number;
}

export interface CreateInvoiceInput {
  /** Unique per application. A repeat returns the existing invoice. */
  external_ref: string;
  customer: CustomerInput;
  lines: InvoiceLineInput[];
  /** Both drive deferred revenue. Omit for one-off work. */
  service_starts_at?: string;
  service_ends_at?: string;
  due_at?: string;
  /** What you are selling, in your words. See {@link Presentation}. */
  presentation?: Presentation;
}

/**
 * The plan, described by you, shown to your customer.
 *
 * Softmato knows the invoice says "HostelHub — Annual Plan" for NPR 20,000. It
 * does not know the plan includes 500 beds and nightly backups, because that
 * is your product. Send this and we render it: on the checkout page beside the
 * amount, and on the invoice under the line items.
 *
 * **It is presentation, never arithmetic.** Nothing here can change what is
 * charged — the amount comes from `lines`. That is why we can accept it from
 * you at all.
 *
 * The rules, all enforced; a request that breaks one is rejected with a
 * message naming the field:
 *
 *   - Plain text. No HTML, no Markdown — it is escaped, so a tag arrives
 *     looking like a mistake.
 *   - At most 8 `features`, 120 characters each.
 *   - At most 3 `highlights`, 60 characters each.
 *   - **No prices anywhere.** `NPR 5,000`, `Rs. 5000` and `5,000/-` are all
 *     rejected. The amount is stated once, by us, from the invoice — a figure
 *     in a feature line that disagrees with the total becomes a billing
 *     dispute, and the customer would be right.
 *   - Omit it entirely and nothing is rendered. No placeholder plan name is
 *     invented on your behalf.
 */
export interface Presentation {
  /** The plan's own name, e.g. `Growth — Annual`. Max 80 characters. */
  plan_name: string;
  /** One line under the name. Max 140. */
  tagline?: string;
  /** The bullet list. Max 8, 120 characters each. */
  features?: string[];
  /** Set apart from the bullets. Max 3, 60 characters each. */
  highlights?: string[];
  /** `12 months`, `until 2027-08-24`. Free text; the invoice's own service
   *  window remains the authoritative dates. Max 60. */
  billing_period?: string;
}

export interface Invoice {
  invoice_id: string;
  invoice_no: string;
  external_ref: string;
  /** Paisa. */
  total_minor: number;
  currency: string;
  status: string;
  due_at: string | null;
  created_at: string;
}

export interface CreateCheckoutInput {
  invoice_id: string;
  /** Where we send the customer once the payment is settled. Must be https. */
  return_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  session_id: string;
  /** Open this in the customer's browser. */
  checkout_url: string;
  expires_at: string;
  allowed_providers: string[];
}

export interface TransactionView {
  transaction_id: string;
  invoice_id: string;
  status: string;
  /** Paisa. */
  amount_minor: number;
  /** Paisa, as reported by the provider. Never a computed percentage. */
  provider_fee_minor: number;
  currency: string;
  provider: string;
  created_at: string;
  succeeded_at: string | null;
}

export interface CreateRefundInput {
  transaction_id: string;
  /** Paisa. Omit to request the full amount. */
  amount_minor?: number;
  reason: string;
}

export interface RefundRequest {
  refund_id: string;
  transaction_id: string;
  /** Paisa. */
  amount_minor: number;
  /**
   * Always `requested` on creation. **A SaaS can never approve a refund**
   * (docs/API.md §3) — approval happens in the Softmato admin panel, and this
   * endpoint files a request, nothing more.
   */
  status: string;
  created_at: string;
}

/** A party as printed on a document. Any field but `name` may be absent. */
export interface DocumentParty {
  name: string;
  address: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
}

export interface InvoiceDocumentLine {
  line_no: number;
  description: string;
  period_start: string | null;
  period_end: string | null;
  /** The stored decimal, as a string — `1`, `1.5`. */
  quantity: string;
  /** Paisa. */
  unit_price_minor: number;
  /** Paisa. */
  amount_minor: number;
}

/**
 * One invoice in full — what a billing screen in your own settings is built
 * from. `GET /v1/invoices/{invoice_no}`.
 */
export interface InvoiceDetail {
  object: 'invoice';
  invoice_id: string;
  fiscal_year: string;
  /**
   * The reader's status, not the stored one. `past_due` is `issued` plus a due
   * date in the past, computed when you ask — so an invoice three weeks late
   * says so rather than saying `issued`.
   */
  status:
    'unpaid' | 'partially_paid' | 'paid' | 'past_due' | 'void' | 'written_off';
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  seller: DocumentParty;
  customer: DocumentParty;
  lines: InvoiceDocumentLine[];
  /** All paisa. */
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
  paid_minor: number;
  due_minor: number;
  /** Echoed back exactly as you sent it, or `null` if you sent none. */
  presentation: (Presentation & { version: number }) | null;
  /** Add `?format=pdf` to this URL for the file. */
  document_url: string;
}

/**
 * The receipt for one settled payment. `GET /v1/receipts/{txn_no}`.
 *
 * `amount_minor` is the **gross** — what left the payer's account. The
 * provider's fee is our cost, not a deduction from what they paid.
 */
export interface ReceiptDetail {
  object: 'receipt';
  receipt_id: string;
  invoice_id: string;
  fiscal_year: string;
  currency: string;
  /** Paisa, gross. */
  amount_minor: number;
  /** Display name of the gateway — `eSewa`, not `esewa`. */
  provider: string;
  /** The gateway's own reference, for your customer's own reconciliation. */
  provider_ref: string | null;
  paid_at: string;
  seller: DocumentParty;
  customer: DocumentParty;
  /** All paisa, across every payment against the invoice. */
  invoice_total_minor: number;
  total_received_minor: number;
  balance_due_minor: number;
  document_url: string;
}

/** A document downloaded as a file. */
export interface DocumentFile {
  /** `application/pdf`, or `text/html` when the PDF fallback was taken. */
  contentType: string;
  /**
   * Non-null when a PDF was asked for and HTML was returned instead, saying
   * why. Check it before naming the file: an HTML body saved as `.pdf` is a
   * file the customer's reader refuses to open.
   */
  pdfFallbackReason: string | null;
  bytes: Uint8Array;
}

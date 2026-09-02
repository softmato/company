/**
 * What an invoice and a receipt *are*, as values, before anything renders them.
 *
 * The layouts in the billing spec (§5, §6) are rendered from these and nothing
 * else. That separation is the point: the same value feeds the web page, the
 * PDF and the email, so the three cannot disagree about what an invoice says —
 * only about how it looks.
 *
 * **Money stays `bigint` paisa all the way to the renderer**, which is the
 * house rule (docs/CODING_STANDARDS.md). A document is the last place money
 * should become a string, and the renderer is the only thing entitled to do it.
 *
 * **Dates stay `Date`.** BS is a display concern (`lib/format/date.ts`), and a
 * document that stored a BS string could never be re-rendered if the
 * conversion table were corrected.
 */

import type { Presentation } from './presentation';

/**
 * A party on a document — us at the top, the customer in BILL TO.
 *
 * Every field but `name` is nullable, and that is load-bearing rather than
 * lax. The company's PAN, address and phone live in `platform_settings` and
 * are **blank until the founder fills them in**. A renderer that invented a
 * plausible PAN to fill the gap would be putting a false tax number on a
 * statutory document; the rule elsewhere in this codebase is that a blank is
 * honest where a made-up value is not (`lib/settings/registry.ts`), and it
 * applies here with more force than anywhere else.
 */
export interface Party {
  name: string;
  address: string | null;
  /** Permanent Account Number. Mandatory on our side (spec §5) — see above. */
  pan: string | null;
  email: string | null;
  phone: string | null;
}

/** One row of the invoice's item table. */
export interface DocumentLine {
  lineNo: number;
  description: string;
  /** The service window this line covers, when it has one. */
  periodStart: Date | null;
  periodEnd: Date | null;
  /** Kept as the stored decimal string — `1`, `1.5`, `0.250`. */
  quantity: string;
  unitPriceMinor: bigint;
  amountMinor: bigint;
}

/**
 * The badge in the top-right of the invoice (spec §5).
 *
 * Deliberately *not* the `invoice_status` enum. The enum is what the database
 * needs; this is what a reader needs, and the two differ in one important
 * place: `past_due` is not a stored status at all — it is `issued` plus a
 * `due_at` in the past, computed at render. Printing "ISSUED" on an invoice
 * that is three weeks late would be technically true and practically useless.
 */
export type DocumentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'past_due'
  | 'void'
  | 'written_off';

export interface InvoiceDocument {
  kind: 'invoice';
  invoiceNo: string;
  fiscalYear: string;
  seller: Party;
  customer: Party;
  /** NULL only for a draft, which has no number and no issue date. */
  issuedAt: Date | null;
  dueAt: Date | null;
  lines: DocumentLine[];
  subtotalMinor: bigint;
  discountMinor: bigint;
  /**
   * Softmato is PAN-registered and not VAT-registered, so this is 0 and the
   * renderer omits the row entirely (spec §5: printing "VAT: 0%" implies a VAT
   * registration we do not have). It is carried anyway because a non-zero
   * value must never be silently dropped from a total the customer pays.
   */
  taxMinor: bigint;
  totalMinor: bigint;
  paidMinor: bigint;
  dueMinor: bigint;
  currency: string;
  status: DocumentStatus;
  /**
   * What the SaaS said it was selling, in its own words — the same block the
   * checkout page showed the customer. Listed under the line items so the
   * invoice and the payment page describe the purchase identically; `null`
   * when the integrator sent none.
   */
  presentation: Presentation | null;
  /**
   * True when the seller/customer details were read live rather than from a
   * snapshot frozen at issue time. See `snapshot.ts` — the renderer says so on
   * the page rather than letting a re-rendered old invoice quietly claim to be
   * the document that was sent.
   */
  renderedFromLiveParties: boolean;
}

export interface ReceiptDocument {
  kind: 'receipt';
  /**
   * The transaction number. There is no separate receipt sequence in this
   * platform — `packages/payment-core/receipts/receipt.ts` explains why, and
   * flags it as unconfirmed with an accountant. The billing spec §2.3 assumes
   * an `R-`-prefixed series; that difference is real and is recorded in
   * docs/MEMORY.md rather than resolved by a renderer.
   */
  receiptNo: string;
  invoiceNo: string;
  fiscalYear: string;
  seller: Party;
  customer: Party;
  /** The gross — what left the payer's account, never net of provider fees. */
  amountMinor: bigint;
  currency: string;
  /** Display name of the gateway (`eSewa`), not its id (`esewa`). */
  providerName: string;
  /** The gateway's own reference, so a payer can match their own statement. */
  providerRef: string | null;
  paidAt: Date;
  /** What this payment was for. One line, never the invoice's whole table. */
  forDescription: string | null;
  invoiceTotalMinor: bigint;
  totalReceivedMinor: bigint;
  balanceDueMinor: bigint;
  /** Our internal trail, printed small. */
  journalNo: string | null;
  renderedFromLiveParties: boolean;
}

/**
 * The words and small formats an invoice and a receipt say identically on the
 * screen, in print and in the PDF — one definition, so the HTML sheets and the
 * PDF drawing cannot come to disagree about what a document says.
 */
import type { DocumentStatus } from './types';

/** What the status badge says. Reader's words, not the enum's. */
export const STATUS_LABEL: Record<DocumentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Part paid',
  paid: 'Paid',
  past_due: 'Overdue',
  void: 'Void',
  written_off: 'Written off',
};

export const PAY_NOTE = 'Pay via Khalti · eSewa · Fonepay · Bank transfer.';

/**
 * The single sentence that does the whole of our VAT compliance on a document.
 *
 * Billing spec §5 is precise about this and the precision is the point: we
 * state that no VAT is charged, and we never print a `VAT: 0%` row, because a
 * zero-rate line implies a registration Softmato does not hold.
 *
 * It takes the seller's name rather than hardcoding one. The name at the top
 * of the document comes from `company.legal_name` and reads "Softmato
 * Technology Private Limited"; a footer that said "Pvt. Ltd." instead was two
 * different entities naming themselves on one page, which is exactly the kind
 * of small inconsistency that makes a reader doubt a financial document.
 */
export function vatNote(sellerName: string): string {
  return (
    `${sellerName} is PAN-registered and is not registered for VAT. ` +
    'No VAT is charged on this document.'
  );
}

/** `2026-08-25`. ISO in the period column — a range reads faster when both
 * ends are the same fixed width. */
export function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** `1.000` → `1`, `1.500` → `1.5`. The stored scale is 3; nobody reads that. */
export function trimQuantity(quantity: string): string {
  return quantity.includes('.')
    ? quantity.replace(/0+$/, '').replace(/\.$/, '')
    : quantity;
}

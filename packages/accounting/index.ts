// packages/accounting — no `next` import, never imports payment-core.
export { postJournal } from './post-journal';
export type {
  JournalLineInput,
  PostJournalInput,
  PostedJournal,
} from './post-journal';
export { resolveFiscalPeriod } from './periods/resolve';
export {
  allocateDocumentNo,
  allocateSequence,
  formatDocumentNo,
} from './numbering';
export type { SequenceKind } from './numbering';
export { AccountingError } from './errors';

// Posting rules — one file per numbered section of CHART_OF_ACCOUNTS.md §9.
export {
  BANK_CURRENT,
  DEFAULT_RECEIVABLE_BY_KIND,
  DEFAULT_REVENUE_BY_KIND,
  DEFERRED_REVENUE,
  RECEIVABLE,
  REVENUE,
  isInvoiceableKind,
  type InvoiceableProductKind,
} from './rules/accounts';
export { invoiceIssuedJournal } from './rules/invoice-issued';
export type {
  InvoiceIssuedInput,
  InvoiceLineForPosting,
} from './rules/invoice-issued';
export { paymentReceivedJournal } from './rules/payment-received';
export type { PaymentReceivedInput } from './rules/payment-received';

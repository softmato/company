/**
 * Posting rule: an invoice is issued.
 * docs/CHART_OF_ACCOUNTS.md §9.1 (subscription) and §9.7 (agency).
 *
 * §9.1 — NPR 12,000 for 12 months:
 *
 *     Dr  1110  AR — SaaS Subscriptions        12,000
 *         Cr  2110  Deferred Revenue                   12,000
 *
 * §9.7 — agency invoice, work already scoped:
 *
 *     Dr  1120  AR — Projects & Agency        100,000
 *         Cr  4020  Software Development Revenue      100,000
 *
 * The only thing that differs is what gets credited, and the deciding fact is
 * whether the invoice covers a future service window. "You have not earned
 * NPR 12,000 — you have earned nothing yet and owe twelve months of service"
 * (docs/CHART_OF_ACCOUNTS.md §3). No service window means the work is the
 * invoice, and revenue is earned on issue.
 *
 * Pure: builds the journal, posts nothing. The caller owns the transaction.
 */
import { AccountingError } from '../errors';
import type { PostJournalInput } from '../post-journal';
import { DEFERRED_REVENUE } from './accounts';

export interface InvoiceLineForPosting {
  description: string;
  amountMinor: bigint;
  /** Which 4xxx account this line earns into once it is earned. */
  revenueAccount: string;
}

export interface InvoiceIssuedInput {
  invoiceId: number;
  invoiceNo: string;
  /** Ledger dimension — what makes per-product P&L possible. */
  productId: string;
  customerId: number;
  receivableAccount: string;
  lines: InvoiceLineForPosting[];
  /** Economic date: when the invoice was issued, not `now()`. */
  occurredAt: Date;
  /**
   * Present when the invoice buys a period of service. Its presence, not its
   * length, is what sends the credit to deferred revenue.
   */
  serviceStartsAt?: Date | null;
  serviceEndsAt?: Date | null;
  postedBy?: number;
}

export function invoiceIssuedJournal(
  input: InvoiceIssuedInput,
): PostJournalInput {
  if (input.lines.length === 0) {
    throw new AccountingError(
      'EMPTY_JOURNAL',
      'An invoice with no lines has nothing to post',
      { invoiceNo: input.invoiceNo },
    );
  }

  const total = input.lines.reduce((sum, line) => sum + line.amountMinor, 0n);

  if (total <= 0n) {
    throw new AccountingError(
      'INVALID_AMOUNT',
      'An invoice must total more than zero to be posted',
      { invoiceNo: input.invoiceNo, totalMinor: total.toString() },
    );
  }

  const deferred = input.serviceStartsAt != null && input.serviceEndsAt != null;

  return {
    source: 'invoice',
    sourceTable: 'invoices',
    sourceId: String(input.invoiceId),
    description: `Invoice ${input.invoiceNo} issued`,
    occurredAt: input.occurredAt,
    ...(input.postedBy !== undefined ? { postedBy: input.postedBy } : {}),
    lines: [
      {
        accountCode: input.receivableAccount,
        direction: 'debit',
        amountMinor: total,
        productId: input.productId,
        customerId: input.customerId,
        memo: `Invoice ${input.invoiceNo}`,
      },
      // One credit line per invoice line, so a mixed invoice — development
      // work plus a setup fee — lands in the right revenue accounts rather
      // than being lumped into whichever one came first.
      ...input.lines.map((line) => ({
        accountCode: deferred ? DEFERRED_REVENUE : line.revenueAccount,
        direction: 'credit' as const,
        amountMinor: line.amountMinor,
        productId: input.productId,
        customerId: input.customerId,
        memo: line.description,
      })),
    ],
  };
}

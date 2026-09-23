/**
 * Posting rule: a refund has been paid back to the customer.
 * docs/CHART_OF_ACCOUNTS.md §9.6.
 *
 * §9.6 — NPR 3,000 refunded, service not yet earned:
 *
 *     Dr  2110  Deferred Revenue — Subscriptions      3,000
 *         Cr  1032  Khalti Merchant Wallet                     3,000
 *
 * "If the period were already earned, debit 4900 instead of 2110." Nothing
 * recognises deferred revenue yet, so an invoice that was credited to 2110 is
 * still wholly unearned and its refund comes out of 2110; an invoice earned on
 * issue comes out of 4900. `invoiceIssuedJournal` makes the same call from the
 * same fact — whether the invoice has a service window.
 *
 * The credit is the provider's balance account, not the bank: the refund was
 * paid from the provider's merchant wallet, and that is the balance that has
 * to reconcile against their dashboard.
 *
 * Pure: builds the journal, posts nothing. The caller owns the transaction.
 */
import { AccountingError } from '../errors';
import type { PostJournalInput } from '../post-journal';
import { DEFERRED_REVENUE } from './accounts';

/** docs/CHART_OF_ACCOUNTS.md §5 — Refunds & Sales Returns (contra-revenue). */
export const REFUNDS_AND_RETURNS = '4900';

export interface RefundIssuedInput {
  refundId: number;
  refundNo: string;
  txnNo: string;
  productId: string;
  customerId: number;
  /** The provider's balance account the money left from: 1031, 1032, 1033. */
  balanceAccount: string;
  /** True when the invoice was credited to deferred revenue. */
  deferred: boolean;
  amountMinor: bigint;
  occurredAt: Date;
  postedBy?: number;
}

export function refundIssuedJournal(
  input: RefundIssuedInput,
): PostJournalInput {
  if (input.amountMinor <= 0n) {
    throw new AccountingError(
      'INVALID_AMOUNT',
      'A refund must be for more than zero to be posted',
      { refundNo: input.refundNo, amountMinor: input.amountMinor.toString() },
    );
  }

  return {
    source: 'refund',
    sourceTable: 'refunds',
    sourceId: String(input.refundId),
    description: `Refund ${input.refundNo} paid back on ${input.txnNo}`,
    occurredAt: input.occurredAt,
    ...(input.postedBy !== undefined ? { postedBy: input.postedBy } : {}),
    lines: [
      {
        accountCode: input.deferred ? DEFERRED_REVENUE : REFUNDS_AND_RETURNS,
        direction: 'debit',
        amountMinor: input.amountMinor,
        productId: input.productId,
        customerId: input.customerId,
        memo: `Refund ${input.refundNo}`,
      },
      {
        accountCode: input.balanceAccount,
        direction: 'credit',
        amountMinor: input.amountMinor,
        productId: input.productId,
        customerId: input.customerId,
        memo: `Refund ${input.refundNo} on ${input.txnNo}`,
      },
    ],
  };
}

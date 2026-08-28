/**
 * Posting rule: a gateway payment is confirmed.
 * docs/CHART_OF_ACCOUNTS.md §9.2.
 *
 * §9.2 — NPR 12,000 paid via Khalti, fee NPR 240, settled net:
 *
 *     Dr  1032  Khalti Merchant Wallet         11,760
 *     Dr  5010  Payment Provider Fees             240
 *         Cr  1110  AR — SaaS Subscriptions            12,000
 *
 * Three things about that entry are load-bearing.
 *
 * The credit is the **gross** amount, because that is what the customer owed
 * and what their receivable must clear by. Crediting the net would leave 240
 * paisa of debt attached to a customer who paid in full.
 *
 * The fee is **reported by the provider, never computed** (docs/RULES.md §2.7).
 * It arrives in `VerifiedResult.providerFeeMinor` and is passed straight
 * through. A percentage that looks right today silently drifts from the real
 * one, and the difference accumulates in a receivable nobody is watching.
 *
 * The debit goes to the **provider's own balance account**, not to the bank.
 * The money is with the provider until they settle, and 1031/1032/1033 hold a
 * real balance you can reconcile against their dashboard. The move to the bank
 * is a separate entry (§9.5), posted from the settlement advice.
 *
 * Pure: builds the journal, posts nothing. The caller owns the transaction.
 */
import { AccountingError } from '../errors';
import type { PostJournalInput } from '../post-journal';

export interface PaymentReceivedInput {
  transactionId: number;
  txnNo: string;
  invoiceNo: string;
  /** Ledger dimension — what makes per-product P&L possible. */
  productId: string;
  customerId: number;
  /** The provider's balance account: 1031 eSewa, 1032 Khalti, 1033 Fonepay. */
  balanceAccount: string;
  /** Where the provider's cut is expensed. 5010. */
  feeAccount: string;
  /** What the customer's receivable clears by. */
  receivableAccount: string;
  /** What the customer paid. */
  grossAmountMinor: bigint;
  /** What the provider kept. Reported by them; never a computed percentage. */
  providerFeeMinor: bigint;
  /** Economic date: when the payment was confirmed, not `now()`. */
  occurredAt: Date;
  postedBy?: number;
}

export function paymentReceivedJournal(
  input: PaymentReceivedInput,
): PostJournalInput {
  const { grossAmountMinor: gross, providerFeeMinor: fee } = input;

  if (gross <= 0n) {
    throw new AccountingError(
      'INVALID_AMOUNT',
      'A payment must be for more than zero to be posted',
      { txnNo: input.txnNo, grossAmountMinor: gross.toString() },
    );
  }

  if (fee < 0n) {
    throw new AccountingError(
      'INVALID_AMOUNT',
      'A provider fee cannot be negative',
      { txnNo: input.txnNo, providerFeeMinor: fee.toString() },
    );
  }

  /*
   * A fee at or above the gross would post a zero or negative debit to the
   * balance account, which `postJournal` rejects anyway — but the error it
   * gives ("amounts are always positive") describes the symptom rather than
   * the cause. A provider reporting a fee that swallows the payment is a
   * mismatch for a human to look at, not an entry to reshape until it balances.
   */
  if (fee >= gross) {
    throw new AccountingError(
      'INVALID_AMOUNT',
      `Provider fee ${fee} is not less than the gross amount ${gross}; this needs reconciliation, not a journal`,
      {
        txnNo: input.txnNo,
        grossAmountMinor: gross.toString(),
        providerFeeMinor: fee.toString(),
      },
    );
  }

  const net = gross - fee;

  return {
    source: 'payment',
    sourceTable: 'transactions',
    sourceId: String(input.transactionId),
    description: `Payment ${input.txnNo} received for invoice ${input.invoiceNo}`,
    occurredAt: input.occurredAt,
    ...(input.postedBy !== undefined ? { postedBy: input.postedBy } : {}),
    lines: [
      {
        accountCode: input.balanceAccount,
        direction: 'debit',
        amountMinor: net,
        productId: input.productId,
        customerId: input.customerId,
        memo: `Payment ${input.txnNo}`,
      },
      // Omitted entirely when zero: `postJournal` refuses a zero-amount line,
      // and a fee line for nothing is noise in the ledger either way.
      ...(fee > 0n
        ? [
            {
              accountCode: input.feeAccount,
              direction: 'debit' as const,
              amountMinor: fee,
              productId: input.productId,
              customerId: input.customerId,
              memo: `Provider fee on ${input.txnNo}`,
            },
          ]
        : []),
      {
        accountCode: input.receivableAccount,
        direction: 'credit',
        amountMinor: gross,
        productId: input.productId,
        customerId: input.customerId,
        memo: `Invoice ${input.invoiceNo}`,
      },
    ],
  };
}

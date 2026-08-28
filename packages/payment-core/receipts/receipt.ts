/**
 * The receipt a payer gets when their payment is confirmed.
 *
 * **A receipt is a rendering of a succeeded transaction, not a record of its
 * own.** There is no `receipts` table and no separate receipt sequence: the
 * transaction number is the receipt number, and it is already gapless per
 * fiscal year (`packages/accounting/numbering.ts`). A second sequence over the
 * same events would be a second thing to keep gapless, and two numbers for one
 * payment is how a customer and an accountant end up quoting different
 * references for the same money.
 *
 * ⚠ **Unconfirmed with an accountant.** Whether Nepali practice wants a
 * distinct receipt series alongside the invoice series is a question for the
 * founder's accountant, recorded in MEMORY.md. If the answer is yes, this
 * module grows a number and a table; nothing else here changes.
 *
 * Pure. It builds a value and sends nothing — delivery is injected, because
 * `payment-core` may not reach into the app (docs/FOLDER_STRUCTURE.md).
 */

export interface Receipt {
  /** The transaction number, doubling as the receipt reference. */
  receiptNo: string;
  invoiceNo: string;
  /** Who paid. The receipt goes here. */
  payerName: string;
  payerEmail: string | null;
  /** What the customer actually paid, in paisa. Never the net of fees. */
  amountMinor: bigint;
  currency: string;
  /** Display name of the gateway, not its id. */
  providerName: string;
  /** The provider's own reference, so a customer can match their statement. */
  providerRef: string | null;
  paidAt: Date;
  /** The journal this payment posted, for an internal trail. */
  journalNo: string;
}

export interface ReceiptInput {
  txnNo: string;
  invoiceNo: string;
  payerName: string;
  payerEmail: string | null;
  amountMinor: bigint;
  currency: string;
  providerName: string;
  providerRef: string | null;
  paidAt: Date;
  journalNo: string;
}

export function buildReceipt(input: ReceiptInput): Receipt {
  return {
    receiptNo: input.txnNo,
    invoiceNo: input.invoiceNo,
    payerName: input.payerName,
    payerEmail: input.payerEmail,
    /*
     * The gross. A customer's receipt states what left their account — the
     * provider's fee is our cost, not a deduction from what they paid, and a
     * receipt for the net would understate what they are owed on a refund.
     */
    amountMinor: input.amountMinor,
    currency: input.currency,
    providerName: input.providerName,
    providerRef: input.providerRef,
    paidAt: input.paidAt,
    journalNo: input.journalNo,
  };
}

/**
 * Delivery, injected the same way auditing is.
 *
 * It must **never throw**: a receipt that fails to send is not a reason to roll
 * back a confirmed payment. The money moved whether or not the email did, and
 * unwinding the ledger over a mail server would turn a delivery problem into
 * an accounting one. Implementations swallow and report their own failures —
 * `apps/web/lib/email/send.ts` already works this way.
 */
export type ReceiptSender = (receipt: Receipt) => Promise<void>;

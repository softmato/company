import 'server-only';

import {
  findInvoice,
  findPayment,
  paymentsFor,
  type InvoiceRecord,
} from './queries';
import { sellerParty } from './seller-query';
import { resolveParties } from './snapshot';
import type { Party, ReceiptDocument } from './types';

/**
 * A succeeded transaction → the receipt the spec §6 describes.
 *
 * **Only a succeeded payment has a receipt.** A receipt is proof money was
 * received; issuing one for a pending or failed transaction would be a
 * document asserting something that has not happened. `null` is returned for
 * anything else and the surfaces show the payment's real state instead.
 *
 * The amount is the **gross**, matching `packages/payment-core/receipts` — the
 * provider's fee is our cost, not a deduction from what the customer paid, and
 * a receipt for the net understates what they are owed on a refund.
 */
export async function buildReceiptDocument(
  txnNo: string,
  /** See `buildInvoiceDocument` — the same authorization boundary. */
  ownerApplicationId?: number,
): Promise<ReceiptDocument | null> {
  const payment = await findPayment(txnNo, ownerApplicationId);

  if (!payment) return null;

  /*
   * `refunded` and `partially_refunded` keep their receipt: the money *was*
   * received, and the reversal is its own document (a credit note, spec §4.2).
   * Deleting the evidence of a payment because it was later returned is how a
   * ledger stops matching a bank statement.
   */
  const RECEIPTED = ['succeeded', 'refunded', 'partially_refunded'];

  if (!RECEIPTED.includes(payment.status)) return null;

  /*
   * No owner constraint here: the payment has already been checked, and an
   * invoice reachable through a transaction the caller owns is one they are
   * entitled to see. Re-applying it would only break the case where a payment
   * was raised through the API against an invoice created in the admin panel.
   */
  const record = await findInvoice(payment.invoiceNo);

  if (!record) return null;

  const [liveSeller, siblings] = await Promise.all([
    sellerParty(),
    paymentsFor(payment.invoiceId),
  ]);

  const parties = resolveParties(
    record.metadata,
    liveSeller,
    customerParty(record),
  );

  /*
   * Everything received against this invoice, not just this payment. §6 prints
   * "Total Received" and "Balance Due" beside the amount of *this* receipt,
   * which is what makes a part payment legible: the customer can see both what
   * they just paid and where that leaves them.
   */
  const totalReceived = siblings
    .filter((row) => RECEIPTED.includes(row.status))
    .reduce((sum, row) => sum + row.grossAmountMinor, 0n);

  return {
    kind: 'receipt',
    receiptNo: payment.txnNo,
    invoiceNo: payment.invoiceNo,
    fiscalYear: record.fiscalYear,
    seller: parties.seller,
    customer: parties.customer,
    amountMinor: payment.grossAmountMinor,
    currency: payment.currency,
    providerName: payment.providerName,
    /*
     * **`provider_txn_id` first, not `provider_ref`.** Spec §6 wants "the
     * gateway's ID, shown for the customer's own reconciliation", and only one
     * of these columns is that. `provider_ref` is the handle used to *start*
     * the payment — Khalti's pidx, eSewa's `transaction_uuid`, which is our
     * own session id sanitised — and it appears nowhere in the customer's
     * wallet statement. `provider_txn_id` is what the gateway wrote back when
     * it settled: eSewa's `000GYAH`, Khalti's `FHAwbiLzoRvq4jDon6hWha`.
     *
     * Printing the wrong one gives the payer a reference their own statement
     * does not contain, which is worse than printing none: they conclude our
     * record is of a different payment.
     */
    providerRef: payment.providerTxnId ?? payment.providerRef,
    /* A succeeded payment always has `succeeded_at` — the schema enforces it
     * (`succeeded_needs_timestamp`). The fallback is for the refunded case. */
    paidAt: payment.succeededAt ?? payment.createdAt,
    forDescription: record.productName,
    invoiceTotalMinor: record.totalMinor,
    totalReceivedMinor: totalReceived,
    balanceDueMinor: record.totalMinor - totalReceived,
    journalNo: payment.journalNo,
    renderedFromLiveParties: parties.fromLive,
  };
}

function customerParty(record: InvoiceRecord): Party {
  return {
    name: record.customerName,
    address: record.customerAddress,
    pan: record.customerPan,
    email: record.customerEmail,
    phone: record.customerPhone,
  };
}

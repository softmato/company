/**
 * One transaction, as a consumer is allowed to see it.
 *
 * The read behind `GET /v1/transactions/{id}` — the endpoint that answers "is
 * TXN-123 paid?" for a SaaS that would otherwise be reading a return URL's
 * query parameters, which are a claim by whoever's browser made the request.
 *
 * **Scoped to the calling application, always.** `ownerApplicationId` is a
 * required parameter rather than an optional one, unlike its document
 * siblings: those are also rendered by the admin panel, where there is no
 * owner to enforce, and this is not. A read with no owner would be a read of
 * every integrator's payments, and making it impossible to express is cheaper
 * than remembering to pass the argument.
 *
 * The caller cannot tell a transaction belonging to somebody else from one
 * that does not exist — both are `undefined` here and `RESOURCE_NOT_FOUND` at
 * the route. That is deliberate: a 403 for the first would confirm that
 * `TXN-2083/84-00000008` is a real payment, which is exactly the thing
 * somebody guessing at numbers is trying to learn.
 *
 * No internal row ids come back. A transaction is addressed by `txn_no` and
 * its invoice by `invoice_no`, the same handles the webhook payload uses.
 */
import { and, eq } from 'drizzle-orm';

import { db, invoices, transactions } from '@softmato/db';

export interface TransactionView {
  txnNo: string;
  invoiceNo: string;
  status: string;
  providerId: string;
  currency: string;
  grossAmountMinor: bigint;
  providerFeeMinor: bigint;
  netAmountMinor: bigint;
  refundedAmountMinor: bigint;
  createdAt: Date;
  succeededAt: Date | null;
}

export async function findTransactionView(
  txnNo: string,
  ownerApplicationId: number,
): Promise<TransactionView | undefined> {
  const [row] = await db
    .select({
      txnNo: transactions.txnNo,
      invoiceNo: invoices.invoiceNo,
      status: transactions.status,
      providerId: transactions.providerId,
      currency: transactions.currency,
      grossAmountMinor: transactions.grossAmountMinor,
      providerFeeMinor: transactions.providerFeeMinor,
      netAmountMinor: transactions.netAmountMinor,
      refundedAmountMinor: transactions.refundedAmountMinor,
      createdAt: transactions.createdAt,
      succeededAt: transactions.succeededAt,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .where(
      and(
        eq(transactions.txnNo, txnNo),
        eq(transactions.applicationId, ownerApplicationId),
      ),
    )
    .limit(1);

  return row;
}

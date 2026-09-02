/**
 * The refunds screen's read model.
 *
 * Read-only, and it will stay that way until two separate things are true.
 * Both are stated on the page, because an approval button that cannot work is
 * worse than none.
 *
 *   1. **No provider can execute a refund.** Every adapter's `refund()` was
 *      removed: eSewa's and Fonepay's returned `status: 'succeeded'` without
 *      contacting anyone, and Khalti's read success from `response.ok` rather
 *      than the body. A refund that reports success it did not achieve posts
 *      reversing entries for money that never went back.
 *   2. **`refund_needs_second_person` cannot be satisfied by one person.** The
 *      constraint requires `approved_by` to differ from `requested_by`, and
 *      the company currently has one admin. That is an open question in
 *      MEMORY.md for the founder, not something to design around here.
 */
import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { customers, db, refunds, transactions } from '@softmato/db';

export interface RefundRow {
  id: number;
  refundNo: string;
  txnNo: string;
  customerName: string;
  providerId: string;
  amountMinor: bigint;
  currency: string;
  reason: string;
  status: string;
  providerRefundId: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}

export async function listRefunds(limit = 100): Promise<RefundRow[]> {
  return db
    .select({
      id: refunds.id,
      refundNo: refunds.refundNo,
      txnNo: transactions.txnNo,
      customerName: customers.name,
      providerId: transactions.providerId,
      amountMinor: refunds.amountMinor,
      currency: refunds.currency,
      reason: refunds.reason,
      status: refunds.status,
      providerRefundId: refunds.providerRefundId,
      requestedAt: refunds.requestedAt,
      completedAt: refunds.completedAt,
    })
    .from(refunds)
    .innerJoin(transactions, eq(transactions.id, refunds.transactionId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .orderBy(desc(refunds.requestedAt))
    .limit(limit);
}

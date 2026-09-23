/**
 * The refunds screen's read model.
 *
 * No adapter can execute a refund, so a refund is paid by hand in the
 * provider's merchant app and booked here afterwards by `recordPaidRefund`
 * (`packages/payment-core/refunds/record-paid.ts`).
 */
import 'server-only';

import type { CredentialMode } from '@softmato/db';

import { desc, eq } from 'drizzle-orm';

import {
  customers,
  db,
  paymentProviders,
  refunds,
  transactions,
} from '@softmato/db';

export interface RefundRow {
  id: number;
  refundNo: string;
  txnNo: string;
  customerName: string;
  providerId: string;
  providerName: string;
  amountMinor: bigint;
  currency: string;
  reason: string;
  status: string;
  providerRefundId: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}

export async function listRefunds(
  mode: CredentialMode,
  limit = 100,
): Promise<RefundRow[]> {
  return (
    db
      .select({
        id: refunds.id,
        refundNo: refunds.refundNo,
        txnNo: transactions.txnNo,
        customerName: customers.name,
        providerId: transactions.providerId,
        providerName: paymentProviders.displayName,
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
      .innerJoin(
        paymentProviders,
        eq(paymentProviders.id, transactions.providerId),
      )
      // A refund has no mode of its own; it inherits the payment's, which is the
      // only honest answer — you cannot refund a Sandbox payment with real money.
      .where(eq(transactions.mode, mode))
      .orderBy(desc(refunds.requestedAt))
      .limit(limit)
  );
}

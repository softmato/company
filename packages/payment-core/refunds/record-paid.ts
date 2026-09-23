/**
 * Recording a refund that was paid back by hand, in the provider's own
 * merchant app. **This does not move money** — the admin already did that.
 *
 * No adapter implements `refund()` (see `request.ts`), so the money goes back
 * through Fonepay's, eSewa's or Khalti's own dashboard, and this books what
 * happened there, in one database transaction:
 *
 *   * the refund row moves `requested` → `succeeded`, carrying the provider's
 *     reference and the admin who paid it;
 *   * the journal (§9.6) takes it out of the provider's balance account, so
 *     that account still reconciles against their dashboard;
 *   * the payment moves to `refunded` or `partially_refunded` and its
 *     `refunded_amount_minor` grows;
 *   * the integrator is sent the matching webhook.
 *
 * `refund_needs_second_person` is satisfied honestly: an API-filed refund has
 * no `requested_by`, so the integrator asked and the admin paid — two parties.
 * A refund an admin filed themselves still cannot be closed by the same admin;
 * the constraint refuses it and this function does not route around that.
 */
import { and, eq, sql } from 'drizzle-orm';

import { postJournal, refundIssuedJournal } from '@softmato/accounting';
import {
  customers,
  invoices,
  paymentProviders,
  refunds,
  transactions,
  type DbTx,
} from '@softmato/db';

import type { AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import {
  assertTransition,
  type TxnStatus,
} from '../transactions/state-machine';
import { enqueueWebhook } from '../webhooks/enqueue';

export interface RecordPaidRefundInput {
  refundNo: string;
  /** Paisa actually sent back. May be less than was requested. */
  amountMinor: bigint;
  /** The provider's reference for the refund, from their merchant app. */
  providerRefundId: string;
  adminId: number;
}

export interface PaidRefund {
  refundNo: string;
  txnNo: string;
  invoiceNo: string;
  amountMinor: bigint;
  currency: string;
  providerRefundId: string;
  providerName: string;
  customerName: string;
  customerEmail: string | null;
  journalNo: string;
}

export async function recordPaidRefund(
  tx: DbTx,
  input: RecordPaidRefundInput,
  audit: AuditRecorder,
  now = new Date(),
): Promise<PaidRefund> {
  const reference = input.providerRefundId.trim();

  if (!reference) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Refund recorded without a provider reference',
      { refundNo: input.refundNo },
      'Enter the refund reference from the provider’s app.',
    );
  }

  // Locked: two admins, or one double-click, must not book the same refund twice.
  const [refund] = await tx
    .select()
    .from(refunds)
    .where(eq(refunds.refundNo, input.refundNo))
    .for('update')
    .limit(1);

  if (!refund) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such refund', {
      refundNo: input.refundNo,
    });
  }

  if (refund.status !== 'requested') {
    throw new PaymentError(
      'INVALID_STATE',
      `Refund is ${refund.status}, not requested`,
      { refundNo: refund.refundNo },
      `${refund.refundNo} is already ${refund.status}.`,
    );
  }

  const [txn] = await tx
    .select()
    .from(transactions)
    .where(eq(transactions.id, refund.transactionId))
    .for('update')
    .limit(1);

  const [context] = await tx
    .select({
      invoiceNo: invoices.invoiceNo,
      serviceStartsAt: invoices.serviceStartsAt,
      serviceEndsAt: invoices.serviceEndsAt,
      customerName: customers.name,
      customerEmail: customers.email,
      providerName: paymentProviders.displayName,
      balanceAccount: paymentProviders.balanceAccount,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .innerJoin(
      paymentProviders,
      eq(paymentProviders.id, transactions.providerId),
    )
    .where(eq(transactions.id, refund.transactionId))
    .limit(1);

  if (!txn || !context) {
    throw new PaymentError('INTERNAL', 'Refund has no transaction behind it', {
      refundNo: refund.refundNo,
    });
  }

  const remaining = txn.grossAmountMinor - txn.refundedAmountMinor;

  if (input.amountMinor <= 0n || input.amountMinor > remaining) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Refund of ${input.amountMinor} outside 1..${remaining}`,
      { refundNo: refund.refundNo },
      `The amount must be more than zero and at most ${remaining} paisa, what is still refundable on ${txn.txnNo}.`,
    );
  }

  const refundedAfter = txn.refundedAmountMinor + input.amountMinor;
  const next: TxnStatus =
    refundedAfter === txn.grossAmountMinor ? 'refunded' : 'partially_refunded';

  assertTransition(txn.status as TxnStatus, next, { txnNo: txn.txnNo });

  const posted = await postJournal(
    tx,
    refundIssuedJournal({
      refundId: refund.id,
      refundNo: refund.refundNo,
      txnNo: txn.txnNo,
      productId: txn.productId,
      customerId: txn.customerId,
      balanceAccount: context.balanceAccount,
      deferred:
        context.serviceStartsAt != null && context.serviceEndsAt != null,
      amountMinor: input.amountMinor,
      occurredAt: now,
      postedBy: input.adminId,
    }),
  );

  await tx
    .update(refunds)
    .set({
      status: 'succeeded',
      amountMinor: input.amountMinor,
      providerRefundId: reference,
      approvedBy: input.adminId,
      journalId: posted.journalId,
      completedAt: now,
    })
    .where(eq(refunds.id, refund.id));

  const [moved] = await tx
    .update(transactions)
    .set({
      status: next,
      refundedAmountMinor: sql`${transactions.refundedAmountMinor} + ${input.amountMinor}`,
      updatedAt: now,
    })
    .where(
      and(eq(transactions.id, txn.id), eq(transactions.status, txn.status)),
    )
    .returning();

  if (!moved) {
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      'Transaction moved concurrently',
      {
        txnNo: txn.txnNo,
      },
    );
  }

  await audit(
    {
      actorType: 'admin',
      actorId: String(input.adminId),
      action: 'refund.paid',
      resourceType: 'refund',
      resourceId: String(refund.id),
      beforeState: {
        status: refund.status,
        amountMinor: refund.amountMinor.toString(),
      },
      afterState: {
        refundNo: refund.refundNo,
        txnNo: txn.txnNo,
        status: 'succeeded',
        amountMinor: input.amountMinor.toString(),
        providerRefundId: reference,
        journalNo: posted.journalNo,
        transactionStatus: next,
      },
    },
    tx,
  );

  await enqueueWebhook(
    tx,
    moved,
    next === 'refunded' ? 'payment.refunded' : 'payment.partially_refunded',
    context.invoiceNo,
    now,
  );

  return {
    refundNo: refund.refundNo,
    txnNo: txn.txnNo,
    invoiceNo: context.invoiceNo,
    amountMinor: input.amountMinor,
    currency: refund.currency,
    providerRefundId: reference,
    providerName: context.providerName,
    customerName: context.customerName,
    customerEmail: context.customerEmail,
    journalNo: posted.journalNo,
  };
}

/**
 * Filing a refund request. **This does not refund anything.**
 *
 * The distinction is the whole point of the file, so it is stated here rather
 * than left to be inferred from a status column: this inserts a `refunds` row
 * at `requested` and stops. No money moves, no journal posts, no provider is
 * contacted. An admin approves it later, in the admin panel, and today that
 * panel is read-only.
 *
 * Two things stand in the way of it being more than this, and both are
 * correct:
 *
 *   1. **No provider adapter implements `refund()`.** Every one was removed
 *      (`todo.md` §0.8) because the implementations were guesses — eSewa's and
 *      Fonepay's returned `succeeded` without contacting anyone. A refund that
 *      reports a success it did not achieve posts reversing entries for money
 *      that never went back.
 *   2. **`refund_needs_second_person` forbids `approved`, `pending` and
 *      `succeeded`** unless `approved_by` is set and differs from
 *      `requested_by`. That constraint stays.
 *
 * `requested_by` is deliberately left null here. It is an admin id column and
 * there is no admin on this path — the request came from an integrator over
 * the API. The audit entry records which application filed it, which is the
 * fact worth keeping; writing an admin's id for a request no admin made would
 * be worse than writing nothing.
 */
import { and, eq } from 'drizzle-orm';

import { allocateDocumentNo, resolveFiscalPeriod } from '@softmato/accounting';
import { invoices, refunds, transactions, type DbTx } from '@softmato/db';

import type { AuthenticatedApplication } from '../applications/authenticate';
import type { AuditRecorder } from '../audit';
import { PaymentError } from '../errors';

export interface RequestRefundInput {
  /** The `txn_no`, as the webhook and `GET /v1/transactions` both spell it. */
  transactionId: string;
  /** Paisa. Omit for the whole refundable balance. */
  amountMinor?: bigint;
  reason: string;
}

export interface FiledRefund {
  refundNo: string;
  txnNo: string;
  amountMinor: bigint;
  currency: string;
  reason: string;
  status: string;
  requestedAt: Date;
}

/**
 * The statuses a refund can be filed against.
 *
 * `partially_refunded` is here on purpose: a second request against a payment
 * that was already partly returned is a normal thing to want. `refunded` is
 * not — there is nothing left. Everything else never received money at all.
 */
const REFUNDABLE = ['succeeded', 'partially_refunded'];

/**
 * Takes the transaction rather than opening one, for the same two reasons
 * `startPayment` does: `allocateDocumentNo` holds a transaction-scoped
 * advisory lock and must run in the transaction that inserts the row or it
 * leaves a hole in the sequence, and on the API path this has to commit
 * together with the idempotency record.
 */
export async function requestRefund(
  tx: DbTx,
  application: AuthenticatedApplication,
  input: RequestRefundInput,
  audit: AuditRecorder,
  now = new Date(),
): Promise<FiledRefund> {
  const [txn] = await tx
    .select({
      id: transactions.id,
      txnNo: transactions.txnNo,
      status: transactions.status,
      currency: transactions.currency,
      grossAmountMinor: transactions.grossAmountMinor,
      refundedAmountMinor: transactions.refundedAmountMinor,
      invoiceNo: invoices.invoiceNo,
    })
    .from(transactions)
    .innerJoin(invoices, eq(invoices.id, transactions.invoiceId))
    .where(
      and(
        eq(transactions.txnNo, input.transactionId),
        eq(transactions.applicationId, application.id),
      ),
    )
    .limit(1);

  /*
   * Another integrator's payment and a payment that does not exist answer
   * identically. The ownership clause is in the `WHERE`, so there is nothing
   * here that could tell them apart even if somebody wanted to.
   */
  if (!txn) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such transaction.', {
      transaction_id: input.transactionId,
    });
  }

  if (!REFUNDABLE.includes(txn.status)) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Refund requested against a ${txn.status} transaction`,
      { transaction_id: txn.txnNo, status: txn.status },
      /*
       * Safe to say out loud: it is the caller's own payment, and its status
       * is already readable at `GET /v1/transactions/{txn_no}`. Naming the
       * status is the difference between a self-service fix and a support
       * thread.
       */
      `${txn.txnNo} is ${txn.status.toUpperCase()}. Only a payment that has succeeded can be refunded.`,
    );
  }

  const remaining = txn.grossAmountMinor - txn.refundedAmountMinor;
  const amountMinor = input.amountMinor ?? remaining;

  if (amountMinor <= 0n) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Refund amount ${amountMinor} is not positive`,
      { transaction_id: txn.txnNo },
      'amount_minor must be a positive number of paisa.',
    );
  }

  /*
   * Checked against what has actually been paid back, not against what has
   * already been *asked for*. Two outstanding requests can therefore add up to
   * more than the payment — which is right: neither is a refund yet, and the
   * admin approving the second one is the person who should see that.
   */
  if (amountMinor > remaining) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Refund of ${amountMinor} exceeds ${remaining} refundable`,
      { transaction_id: txn.txnNo },
      `${amountMinor} paisa is more than the ${remaining} paisa still refundable on ${txn.txnNo}.`,
    );
  }

  const period = await resolveFiscalPeriod(tx, now);
  const { documentNo } = await allocateDocumentNo(tx, 'RFD', period.fiscalYear);

  const [filed] = await tx
    .insert(refunds)
    .values({
      refundNo: documentNo,
      transactionId: txn.id,
      amountMinor,
      currency: txn.currency,
      reason: input.reason,
      /*
       * The only status this path may write, and the only one the CHECK
       * constraint lets a single actor write at all.
       */
      status: 'requested',
      requestedAt: now,
    })
    .returning();

  if (!filed) {
    throw new PaymentError('INTERNAL', 'Refund insert returned no row', {
      refundNo: documentNo,
    });
  }

  await audit(
    {
      actorType: 'application',
      actorId: application.clientId,
      action: 'refund.request',
      resourceType: 'refund',
      resourceId: String(filed.id),
      afterState: {
        refundNo: filed.refundNo,
        txnNo: txn.txnNo,
        invoiceNo: txn.invoiceNo,
        amountMinor: amountMinor.toString(),
        currency: txn.currency,
        status: filed.status,
      },
    },
    tx,
  );

  return {
    refundNo: filed.refundNo,
    txnNo: txn.txnNo,
    amountMinor: filed.amountMinor,
    currency: filed.currency,
    reason: filed.reason,
    status: filed.status,
    requestedAt: filed.requestedAt,
  };
}

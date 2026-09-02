/**
 * Moving a transaction's status, safely.
 *
 * The sibling of `sessions/transition.ts`, and it exists for the same reason:
 * a transaction's status is written from a callback, a poll, a job and an
 * admin screen, and every one of those is a chance to write a move the state
 * machine forbids.
 *
 * **Nothing here may write `succeeded`.** That status means money is ours and
 * a journal entry must exist alongside it — the `succeeded_needs_journal`
 * constraint enforces exactly that — so it is reachable only through
 * `completePayment`, which posts the journal in the same transaction. This
 * function refuses it rather than letting the database refuse it later, so the
 * mistake is caught where it is made.
 */
import { and, eq } from 'drizzle-orm';

import { transactions, type DbLike, type Transaction } from '@softmato/db';

import { PaymentError } from '../errors';
import { assertTransition, type TxnStatus } from './state-machine';

export interface TransitionOptions {
  providerTxnId?: string | null;
  providerFeeMinor?: bigint;
  failureReason?: string | null;
}

export async function transitionTransaction(
  tx: DbLike,
  transaction: Transaction,
  next: Exclude<TxnStatus, 'succeeded'>,
  options: TransitionOptions = {},
  now = new Date(),
): Promise<Transaction> {
  if ((next as TxnStatus) === 'succeeded') {
    throw new PaymentError(
      'INTERNAL',
      'A transaction reaches succeeded only through completePayment, which posts the journal with it',
      { txnNo: transaction.txnNo },
    );
  }

  assertTransition(transaction.status as TxnStatus, next, {
    txnNo: transaction.txnNo,
  });

  const [moved] = await tx
    .update(transactions)
    .set({
      status: next,
      updatedAt: now,
      ...(options.providerTxnId ? { providerTxnId: options.providerTxnId } : {}),
      ...(options.providerFeeMinor !== undefined
        ? { providerFeeMinor: options.providerFeeMinor }
        : {}),
      ...(options.failureReason !== undefined
        ? { failureReason: options.failureReason }
        : {}),
    })
    /*
     * Compare-and-set on the status we read. Two pollers, or a poller and a
     * returning customer, routinely arrive at once; the loser must not
     * overwrite the winner's work.
     */
    .where(
      and(
        eq(transactions.id, transaction.id),
        eq(transactions.status, transaction.status),
      ),
    )
    .returning();

  if (!moved) {
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      'Transaction changed status concurrently; the move was refused',
      { txnNo: transaction.txnNo, attempted: next },
    );
  }

  return moved;
}

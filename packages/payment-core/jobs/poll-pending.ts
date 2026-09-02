/**
 * `poll-pending-transactions` — the job the money depends on.
 *
 * Khalti never pushes, eSewa's return trip depends on a customer's browser
 * completing a redirect, and any customer may close the tab. So for a large
 * share of payments **this job is the only thing that will ever notice the
 * money arrived** (docs/ARCHITECTURE.md §6). Nothing else in the system has
 * that property, which is why it runs every minute.
 *
 * Each due transaction goes through `confirmTransaction`, exactly as a
 * returning customer would — same lookup, same `provider_events` row, same
 * settlement. There is no separate "job path" to drift out of step with the
 * one people actually use.
 *
 * **Every transaction is attempted even if the one before it threw.** A
 * gateway timing out on one payment must not stop the other forty from
 * settling; failures are counted and reported, not propagated.
 */
import { and, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import { transactions, type DbLike, type Transaction } from '@softmato/db';

import type { AuditRecorder } from '../audit';
import type { ReceiptSender } from '../receipts/receipt';
import { confirmTransaction } from '../transactions/confirm';
import type { TxnStatus } from '../transactions/state-machine';
import { transitionTransaction } from '../transactions/transition';
import { nextPollAt, pollExhausted } from './backoff';

/** The statuses `txn_poll_idx` is partial on. Keep the two in step. */
const LIVE: readonly TxnStatus[] = ['created', 'pending'];

export interface PollPendingResult {
  examined: number;
  settled: number;
  stillPending: number;
  closed: number;
  flagged: number;
  /** The provider could not be reached, or answered something unusable. */
  errors: number;
}

export async function pollPendingTransactions(
  db: DbLike,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  now = new Date(),
  /*
   * Sized against the cron runner's timeout, not against how much work exists.
   *
   * Every transaction here costs a provider round trip, so 100 of them can
   * easily outrun the 30 seconds cron-job.org allows. That matters more than a
   * slow job normally would: an over-running request is recorded as a *failed*
   * execution, and cron-job.org disables a job after enough failures. The job
   * that stops would be the only thing confirming payments where the customer
   * closed the tab, and it would stop silently.
   *
   * 25 a minute is 1,500 an hour, and a backlog is drained by the next run —
   * the job is self-healing, so a small batch costs latency, never work.
   */
  limit = 25,
): Promise<PollPendingResult> {
  const due = await db
    .select()
    .from(transactions)
    .where(
      and(
        inArray(transactions.status, [...LIVE]),
        // A transaction never polled has no `next_poll_at` and is due now.
        or(isNull(transactions.nextPollAt), lte(transactions.nextPollAt, now)),
      ),
    )
    .limit(limit);

  const result: PollPendingResult = {
    examined: due.length,
    settled: 0,
    stillPending: 0,
    closed: 0,
    flagged: 0,
    errors: 0,
  };

  for (const txn of due) {
    if (pollExhausted(txn.pollAttempts)) {
      await giveUp(db, txn, audit, now);
      result.flagged += 1;
      continue;
    }

    try {
      const outcome = await confirmTransaction(
        txn,
        audit,
        sendReceipt,
        'poll',
        now,
      );

      if (outcome.state === 'settled') result.settled += 1;
      else if (outcome.state === 'closed') result.closed += 1;
      else if (outcome.state === 'reconciliation') result.flagged += 1;
      else result.stillPending += 1;
    } catch {
      /*
       * Swallowed on purpose, and only here.
       *
       * A provider being unreachable is not this job's failure and not the
       * payment's. The attempt is rescheduled below and the next run asks
       * again — which is the whole self-healing premise. Letting it propagate
       * would abandon every transaction after this one in the batch.
       */
      result.errors += 1;
    }

    // Always rescheduled, whatever happened. A transaction that settled or
    // closed leaves `LIVE` and will not be selected again regardless.
    await reschedule(db, txn, now);
  }

  return result;
}

async function reschedule(
  db: DbLike,
  txn: Transaction,
  now: Date,
): Promise<void> {
  const attempts = txn.pollAttempts + 1;

  await db
    .update(transactions)
    .set({
      pollAttempts: attempts,
      lastPolledAt: now,
      nextPollAt: nextPollAt(attempts, now),
    })
    .where(eq(transactions.id, txn.id));
}

/**
 * Out of attempts, and still nobody knows what happened.
 *
 * Flagged rather than failed. Marking it `failed` would assert the customer
 * did not pay, which is exactly the thing we have been unable to establish for
 * a day of asking — and if they did pay, that assertion loses their money
 * silently. `reconciliation_required` says "a person must look at this", which
 * is true (docs/RULES.md §2.8).
 */
async function giveUp(
  db: DbLike,
  txn: Transaction,
  audit: AuditRecorder,
  now: Date,
): Promise<void> {
  await transitionTransaction(
    db,
    txn,
    'reconciliation_required',
    {
      failureReason: `Unresolved after ${txn.pollAttempts} provider lookups`,
    },
    now,
  );

  await audit({
    actorType: 'system',
    actorId: 'poll-pending-transactions',
    action: 'payment.flagged',
    resourceType: 'transaction',
    resourceId: txn.txnNo,
    beforeState: { status: txn.status, pollAttempts: txn.pollAttempts },
    afterState: { reason: 'poll attempts exhausted' },
  });
}

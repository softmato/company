/**
 * `expire-stale-sessions` — sessions nobody came back to.
 *
 * Every payment path already settles expiry on read (`loadPayableSession`), so
 * this job is not what makes an expired session unpayable. It is the sweeper
 * for sessions nobody looked at: without it, a session abandoned at 10:00 sits
 * saying `created` indefinitely, and the admin screens, the reconciliation
 * report and anything counting open checkouts all read a number that is wrong.
 *
 * **Self-healing, as every job here must be** (docs/ARCHITECTURE.md §6): it
 * asks "which sessions are past their expiry and still open?" rather than
 * "what changed since the last run", so a missed run costs nothing and a
 * double run does nothing twice.
 *
 * **It does not touch transactions.** A session lapsing does not mean the
 * customer failed to pay — they may be finishing at the gateway right now, and
 * the attempt is still live at the provider. Marking those failed here would
 * be inventing an outcome we have not been told. `poll-pending-transactions`
 * resolves them by asking, and `completePayment` handles the case where a
 * payment lands against an already-expired session.
 */
import { and, eq, inArray, lte } from 'drizzle-orm';

import { paymentSessions, type DbLike, type PaymentSession } from '@softmato/db';

import type { AuditRecorder } from '../audit';
import { isPaymentError } from '../errors';
import { transitionSession } from '../sessions/transition';
import type { SessionStatus } from '../sessions/state-machine';

/** The statuses `sessions_expiry_idx` is partial on. Keep the two in step. */
const OPEN: readonly SessionStatus[] = ['created', 'provider_selected', 'pending'];

export interface ExpireSessionsResult {
  expired: number;
  /** Lost a race to something that moved the session first. Not a failure. */
  skipped: number;
}

export async function expireStaleSessions(
  db: DbLike,
  audit: AuditRecorder,
  now = new Date(),
  limit = 500,
): Promise<ExpireSessionsResult> {
  const due = await db
    .select()
    .from(paymentSessions)
    .where(
      and(
        inArray(paymentSessions.status, [...OPEN]),
        lte(paymentSessions.expiresAt, now),
      ),
    )
    .limit(limit);

  let expired = 0;
  let skipped = 0;

  for (const session of due) {
    if (await expireOne(db, session, audit)) expired += 1;
    else skipped += 1;
  }

  return { expired, skipped };
}

/**
 * One session, and a lost race is not an error.
 *
 * A customer paying in the same instant the sweeper runs is ordinary. The
 * compare-and-set inside `transitionSession` means one of them wins; if it is
 * the payment, this must not treat that as a failed run and must certainly not
 * retry it.
 */
async function expireOne(
  db: DbLike,
  session: PaymentSession,
  audit: AuditRecorder,
): Promise<boolean> {
  try {
    await transitionSession(db, session, 'expired');
  } catch (error) {
    if (isPaymentError(error) && error.code === 'ILLEGAL_TRANSITION') {
      return false;
    }

    throw error;
  }

  await audit({
    actorType: 'system',
    actorId: 'expire-stale-sessions',
    action: 'session.expired',
    resourceType: 'payment_session',
    resourceId: session.id,
    beforeState: { status: session.status },
    afterState: { expiresAt: session.expiresAt.toISOString() },
  });

  return true;
}

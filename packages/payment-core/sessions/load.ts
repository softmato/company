/**
 * Reading a session, and the one thing that must happen every time it is read.
 *
 * `expires_at` passing does not change a row. A session created at 10:00 with a
 * 30-minute TTL still says `created` at 11:00, and anything that trusts the
 * status column alone will happily let a customer pay into it. **Expiry is a
 * fact about the clock; `expired` is a fact about the database, and the second
 * one only becomes true because something wrote it.**
 *
 * So every read goes through `loadPayableSession`, which settles the question
 * before anyone acts on the answer. The `expire-stale-sessions` job is a
 * sweeper for sessions nobody looked at — it is not what makes this safe.
 */
import { eq } from 'drizzle-orm';

import {
  paymentSessions,
  type DbLike,
  type PaymentSession,
} from '@softmato/db';

import { PaymentError } from '../errors';
import { isPastExpiry } from './expiry';
import { isSessionIdShape } from './id';
import { isPayable, type SessionStatus } from './state-machine';
import { transitionSession } from './transition';

export async function loadSession(
  tx: DbLike,
  sessionId: string,
): Promise<PaymentSession> {
  // Junk never reaches a query. The id is in a URL, so this endpoint takes
  // whatever a stranger types.
  if (!isSessionIdShape(sessionId)) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'Malformed session id', {
      sessionId,
    });
  }

  const [session] = await tx
    .select()
    .from(paymentSessions)
    .where(eq(paymentSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new PaymentError('RESOURCE_NOT_FOUND', 'No such session', {
      sessionId,
    });
  }

  return session;
}

/**
 * Writes `expired` if the clock has passed and the session was still payable.
 * Returns the session as it now stands, so callers read one value rather than
 * comparing a status against a timestamp themselves — which is the comparison
 * everyone eventually forgets.
 *
 * A session already `succeeded` is left alone: money arrived before the
 * deadline, and expiring it afterwards would be rewriting history over a clock.
 */
export async function expireIfDue(
  tx: DbLike,
  session: PaymentSession,
  now = new Date(),
): Promise<PaymentSession> {
  if (!isPastExpiry(session, now)) return session;
  if (!isPayable(session.status as SessionStatus)) return session;

  try {
    return await transitionSession(tx, session, 'expired');
  } catch {
    // Losing the compare-and-set means something else moved it first — most
    // likely the sweeper job, or a payment landing in the same instant. Re-read
    // rather than fail: the caller asked what state this session is in, and
    // that question now has a better answer than an exception.
    return loadSession(tx, session.id);
  }
}

/**
 * The read every payment path should use: load, settle expiry, then refuse
 * anything that cannot still take a payment.
 *
 * Phase 3 acceptance 7 — "an expired session cannot be paid" — is this
 * function, and the reason it is one call rather than three is that three can
 * be done in the wrong order.
 */
export async function loadPayableSession(
  tx: DbLike,
  sessionId: string,
  now = new Date(),
): Promise<PaymentSession> {
  const session = await expireIfDue(tx, await loadSession(tx, sessionId), now);

  if (session.status === 'expired') {
    throw new PaymentError('SESSION_EXPIRED', 'That session has expired', {
      sessionId,
      expiresAt: session.expiresAt.toISOString(),
    });
  }

  if (!isPayable(session.status as SessionStatus)) {
    throw new PaymentError(
      'INVALID_STATE',
      `A session that is ${session.status} cannot take a payment`,
      { sessionId, status: session.status },
    );
  }

  return session;
}

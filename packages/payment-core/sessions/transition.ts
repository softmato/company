/**
 * The only place `payment_sessions.status` is ever written.
 *
 * A state machine that nothing is forced to go through is a comment. Every
 * entry point that moves a session — provider selection, a callback, a poll, an
 * admin approval, the expiry job — calls this, and the `assertTransition` below
 * is what makes the table in `state-machine.ts` binding rather than advisory.
 *
 * **Concurrency is handled by a compare-and-set, not by a row lock.** The
 * UPDATE carries `WHERE status = <from>`, so two requests that both read
 * `created` cannot both win: the second updates zero rows and is told the
 * session moved underneath it. This is deliberate over `SELECT … FOR UPDATE` —
 * the Neon HTTP driver does not hold a transaction across statements the way
 * the local driver does (docs/MEMORY.md), and a lock that silently does nothing
 * on one of our two drivers is worse than no lock at all.
 */
import { and, eq } from 'drizzle-orm';

import {
  paymentSessions,
  type DbLike,
  type PaymentSession,
} from '@softmato/db';

import { PaymentError } from '../errors';
import { assertTransition, type SessionStatus } from './state-machine';

/** Columns a transition is allowed to set alongside the status. */
export interface TransitionPatch {
  selectedProvider?: string | null;
}

export async function transitionSession(
  tx: DbLike,
  session: PaymentSession,
  to: SessionStatus,
  patch: TransitionPatch = {},
): Promise<PaymentSession> {
  const from = session.status as SessionStatus;

  // Throws. A caller on a money path has no sensible way to carry on.
  assertTransition(from, to, { sessionId: session.id });

  const [updated] = await tx
    .update(paymentSessions)
    .set({
      status: to,
      ...(patch.selectedProvider !== undefined
        ? { selectedProvider: patch.selectedProvider }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(paymentSessions.id, session.id), eq(paymentSessions.status, from)),
    )
    .returning();

  if (!updated) {
    // Zero rows means the status is no longer `from`. Someone else moved it
    // between our read and our write — a second tab, a callback landing while
    // the customer clicks, the expiry job. Never overwrite blindly.
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      'Session changed status concurrently; the transition was refused',
      { sessionId: session.id, expected: from, to },
    );
  }

  return updated;
}

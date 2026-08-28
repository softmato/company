/**
 * Legal transaction transitions, enforced.
 *
 * The table below is the whole point: a payment path has many entry points —
 * a callback, a poll, an admin approval, an expiry job — and every one of them
 * wants to write a status. Without a single table saying what may follow what,
 * "succeeded → pending" is one careless UPDATE away, and a succeeded payment
 * that goes back to pending is a payment that can be credited twice.
 *
 * This module knows nothing about the database. It answers one question.
 */
import { PaymentError } from '../errors';

export type TxnStatus =
  | 'created'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'partially_refunded'
  | 'refunded'
  | 'reversed'
  | 'reconciliation_required';

/**
 * `reconciliation_required` is reachable from anywhere money was expected and
 * is only left by a human decision (RULES.md §2.8 — never auto-resolve).
 */
const TRANSITIONS: Record<TxnStatus, readonly TxnStatus[]> = {
  created: [
    'pending',
    'succeeded',
    'failed',
    'cancelled',
    'expired',
    'reconciliation_required',
  ],
  pending: [
    'succeeded',
    'failed',
    'cancelled',
    'expired',
    'reconciliation_required',
  ],
  succeeded: [
    'partially_refunded',
    'refunded',
    'reversed',
    'reconciliation_required',
  ],
  partially_refunded: [
    'partially_refunded',
    'refunded',
    'reversed',
    'reconciliation_required',
  ],
  refunded: ['reversed', 'reconciliation_required'],
  // A resolved mismatch lands wherever the human says it lands.
  reconciliation_required: ['succeeded', 'failed', 'refunded', 'reversed'],
  // Terminal. A retry is a new transaction, not a resurrected one.
  failed: [],
  cancelled: [],
  expired: [],
  reversed: [],
};

/** Statuses that mean money is ours and a journal entry must exist. */
const SETTLED: ReadonlySet<TxnStatus> = new Set<TxnStatus>([
  'succeeded',
  'partially_refunded',
  'refunded',
]);

export function isSettled(status: TxnStatus): boolean {
  return SETTLED.has(status);
}

export function isTerminal(status: TxnStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(from: TxnStatus, to: TxnStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Throws rather than returning false, because every caller is on a money path
 * and none of them has a sensible way to carry on.
 */
export function assertTransition(
  from: TxnStatus,
  to: TxnStatus,
  context?: Record<string, unknown>,
): void {
  if (!canTransition(from, to)) {
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      `Transaction cannot move from ${from} to ${to}`,
      { from, to, ...context },
    );
  }
}

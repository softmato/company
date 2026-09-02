/**
 * Legal session transitions.
 *
 * A session is the customer's side of a payment — the thing behind the
 * checkout URL. It tracks a transaction but is not one: a customer may pick
 * Khalti, change their mind, and pick manual QR, and the session follows them
 * while each attempt gets its own transaction row.
 *
 * The transition that matters most is the one that is missing: nothing leaves
 * `succeeded`. A paid session cannot be reopened and paid again.
 */
import { PaymentError } from '../errors';

export type SessionStatus =
  | 'created'
  | 'provider_selected'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  created: ['provider_selected', 'cancelled', 'expired'],
  // Re-selection is a legal move: the customer changed method before paying.
  provider_selected: [
    'provider_selected',
    'pending',
    'succeeded',
    'failed',
    'cancelled',
    'expired',
  ],
  // A failed attempt returns the customer to method selection on the same
  // session; the failed transaction stays behind as the record of it.
  pending: ['provider_selected', 'succeeded', 'failed', 'cancelled', 'expired'],
  failed: ['provider_selected', 'cancelled', 'expired'],
  succeeded: [],
  cancelled: [],
  expired: [],
};

/** Statuses from which a customer may still start or continue a payment. */
const PAYABLE: ReadonlySet<SessionStatus> = new Set<SessionStatus>([
  'created',
  'provider_selected',
  'pending',
  'failed',
]);

export function isPayable(status: SessionStatus): boolean {
  return PAYABLE.has(status);
}

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: SessionStatus,
  to: SessionStatus,
  context?: Record<string, unknown>,
): void {
  if (!canTransition(from, to)) {
    throw new PaymentError(
      'ILLEGAL_TRANSITION',
      `Session cannot move from ${from} to ${to}`,
      { from, to, ...context },
    );
  }
}

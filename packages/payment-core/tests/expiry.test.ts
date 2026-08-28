/**
 * The clock half of expiry. The database half — that `expired` actually gets
 * written before anyone is allowed to pay — is in `packages/db/tests`, because
 * it is a fact about a row rather than about a comparison.
 */
import { describe, expect, it } from 'vitest';

import type { PaymentSession } from '@softmato/db';

import { SESSION_TTL_MS, isPastExpiry } from '../sessions/expiry';

function sessionExpiringAt(expiresAt: Date): PaymentSession {
  return { expiresAt } as PaymentSession;
}

describe('session expiry', () => {
  const now = new Date('2026-08-16T10:00:00Z');

  it('is not past expiry a minute before the deadline', () => {
    const session = sessionExpiringAt(new Date('2026-08-16T10:01:00Z'));
    expect(isPastExpiry(session, now)).toBe(false);
  });

  it('is past expiry a minute after the deadline', () => {
    const session = sessionExpiringAt(new Date('2026-08-16T09:59:00Z'));
    expect(isPastExpiry(session, now)).toBe(true);
  });

  // The boundary goes to expired. A session whose deadline is exactly now has
  // had its full window, and `<=` is the reading that cannot let a payment
  // through on a tie.
  it('treats the exact deadline as expired', () => {
    expect(isPastExpiry(sessionExpiringAt(now), now)).toBe(true);
  });

  /**
   * Not a style preference. "Khalti payment links expire after 60 minutes, so
   * session TTL must be ≤ 30 minutes" (docs/API.md §5.2) — a TTL raised past
   * this makes Khalti confirmation fail as customers paying into dead links.
   */
  it('keeps the TTL at or under the 30 minutes Khalti allows', () => {
    expect(SESSION_TTL_MS).toBeLessThanOrEqual(30 * 60 * 1000);
  });
});

/**
 * The clock rules for a session. No database, on purpose.
 *
 * Both values below were originally inside modules that import the Drizzle
 * client, which made them untestable without a live Postgres — a pure question
 * ("has this deadline passed?") could only be asked by something holding a
 * connection. They live here so the rule can be tested as the rule it is.
 */
import type { PaymentSession } from '@softmato/db';

/**
 * 30 minutes, and not a setting.
 *
 * "Khalti payment links expire after 60 minutes, so session TTL must be ≤ 30
 * minutes" (docs/API.md §5.2). A founder raising this from a form would break
 * Khalti confirmation in a way that only shows up as customers paying into
 * dead links, so it stays where a code review can see it.
 */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Has the clock passed it, whatever the status column currently says?
 *
 * The boundary counts as expired: a session whose deadline is exactly now has
 * had its full window, and `<=` is the reading that cannot let a payment
 * through on a tie.
 */
export function isPastExpiry(
  session: Pick<PaymentSession, 'expiresAt'>,
  now = new Date(),
): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

/**
 * When to ask a provider again.
 *
 * Pure, so the schedule can be tested without a database or a clock. The
 * numbers matter more than they look: polling is Khalti's *only* confirmation
 * path (docs/ARCHITECTURE.md §6), so this function is what decides how long a
 * customer waits to find out they have paid.
 *
 * The shape is exponential from a short first delay: 30s, 1m, 2m, 4m, 8m,
 * 16m, 32m, then a flat hour. Fast at the start because almost every payment
 * resolves within a minute or two of the customer finishing at the gateway,
 * and slow later because an attempt still pending after half an hour is
 * probably abandoned and does not deserve a request a minute forever.
 *
 * **Giving up is a decision about money, so it is not "mark it failed".** An
 * attempt still pending after `MAX_POLL_ATTEMPTS` is one where we genuinely do
 * not know what happened — and the honest response to not knowing is a human,
 * not a guess in either direction. `poll-pending-transactions` flags it for
 * reconciliation. That is rare by construction: eSewa answers `NOT_FOUND` for
 * an abandoned intent and Khalti answers `Expired`, both of which close the
 * transaction cleanly long before the ceiling.
 */

/** First retry, and the floor for every later one. */
export const FIRST_DELAY_MS = 30_000;

/** No slower than hourly, however many attempts have gone by. */
export const MAX_DELAY_MS = 60 * 60_000;

/**
 * Roughly a day of asking, given the curve above. Past this the attempt stops
 * being polled and becomes a person's problem.
 */
export const MAX_POLL_ATTEMPTS = 32;

export function pollDelayMs(attempts: number): number {
  const doublings = Math.max(0, attempts);

  /*
   * `2 ** 40` is still a finite number but `FIRST_DELAY_MS * 2 ** 40` is large
   * enough to lose integer precision, and `new Date(NaN)` is a null timestamp
   * that would never be polled again. Capped before it is multiplied.
   */
  if (doublings >= 32) return MAX_DELAY_MS;

  return Math.min(FIRST_DELAY_MS * 2 ** doublings, MAX_DELAY_MS);
}

export function nextPollAt(attempts: number, now = new Date()): Date {
  return new Date(now.getTime() + pollDelayMs(attempts));
}

export function pollExhausted(attempts: number): boolean {
  return attempts >= MAX_POLL_ATTEMPTS;
}

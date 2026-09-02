/**
 * Per-address throttling for the public chat endpoint.
 *
 * `/api/chat` is unauthenticated and reachable by anyone, and one of the tools
 * behind it sends email from the softmato.com domain. Without a limit a single
 * script can generate unbounded outbound mail — to the founders, and to any
 * third-party address an attacker cares to name. That is a deliverability and
 * reputation problem long before it is a cost one.
 *
 * In-memory rather than Postgres, unlike `lib/contact/rate-limit.ts`. The
 * trade is deliberate: a chat turn must feel instant, so it cannot afford a
 * database round trip on the request path, and a limit that resets on deploy
 * is still worth far more than no limit. It is a speed bump, not a wall — if
 * the endpoint is ever genuinely targeted, this belongs at the edge.
 */

import { createHash } from 'node:crypto';

const WINDOW_MS = 60_000;
const MAX_TURNS_PER_WINDOW = 12;

/** Bookings are the expensive action; they get a tighter, longer window. */
const BOOKING_WINDOW_MS = 60 * 60 * 1000;
const MAX_BOOKINGS_PER_WINDOW = 3;

const turns = new Map<string, number[]>();
const bookings = new Map<string, number[]>();

/** Raw addresses are never retained — only a digest, as in the contact form. */
export function hashAddress(address: string): string {
  return createHash('sha256').update(address).digest('hex').slice(0, 32);
}

/** Best-effort client address from proxy headers. */
export function callerAddress(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

function record(
  store: Map<string, number[]>,
  key: string,
  windowMs: number,
  max: number,
): boolean {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    store.set(key, recent);
    return false;
  }

  recent.push(now);
  store.set(key, recent);

  // The map would otherwise grow without bound across a long-lived process.
  if (store.size > 5_000) {
    for (const [k, stamps] of store) {
      if (stamps.every((t) => now - t >= windowMs)) store.delete(k);
    }
  }

  return true;
}

/** False when this caller has sent too many chat turns. */
export function allowTurn(key: string): boolean {
  return record(turns, key, WINDOW_MS, MAX_TURNS_PER_WINDOW);
}

/** False when this caller has booked too many meetings this hour. */
export function allowBooking(key: string): boolean {
  return record(bookings, key, BOOKING_WINDOW_MS, MAX_BOOKINGS_PER_WINDOW);
}

/** Test seam. */
export function __resetLimits(): void {
  turns.clear();
  bookings.clear();
}

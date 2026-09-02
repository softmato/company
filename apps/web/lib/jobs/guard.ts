/**
 * The gate on `/api/jobs/*`.
 *
 * Two requirements from docs/ENVIRONMENT.md §6, both easy to get subtly wrong:
 *
 * **404, not 401.** A 401 confirms the endpoint exists, which turns a guessed
 * URL into a known target worth brute-forcing. An unauthenticated caller
 * should learn nothing, so a bad secret is indistinguishable from a route that
 * was never there.
 *
 * **Timing-safe comparison.** `a === b` on strings returns as soon as two bytes
 * differ, and the time it took says how many matched. That is enough to
 * recover a secret one byte at a time, and it is a real attack against exactly
 * this shape of endpoint — a fixed secret compared on every request.
 */
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';

/** What a caller sees when the secret is wrong, or absent. */
export const NOT_FOUND = NextResponse.json(
  { error: 'Not found' },
  { status: 404 },
);

export function isAuthorisedJobRequest(request: Request): boolean {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) return false;

  return equalInConstantTime(header.slice('Bearer '.length), env.CRON_SECRET);
}

/**
 * Lengths are compared first because `timingSafeEqual` throws on a mismatch.
 * That leaks the length of the secret and nothing else — and an attacker who
 * knows only the length is no closer than one who does not.
 */
function equalInConstantTime(given: string, expected: string): boolean {
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

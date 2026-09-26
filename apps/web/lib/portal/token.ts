/**
 * Opaque tokens for portal sessions and invitations.
 *
 * The browser holds the token; the database holds only its sha256. A leaked
 * table then opens no session and accepts no invitation. sha256 rather than
 * argon2 because the input is 32 random bytes, not a password — there is
 * nothing to brute-force, and a lookup has to be one indexed equality.
 *
 * Pure, so the tests exercise it directly.
 */
import { createHash, randomBytes } from 'node:crypto';

/** base64url: no `.` or `/`, so it survives a path segment and `proxy.ts`. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The shape `newToken` emits. Anything else is refused before a query. */
export function isTokenShape(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

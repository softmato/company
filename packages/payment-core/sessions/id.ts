/**
 * Session identifiers.
 *
 * The id is the only thing standing between a stranger and a customer's
 * checkout page, so it is 32 bytes of CSPRNG (docs/API.md §3) — base64url'd to
 * 43 characters, which satisfies the `session_id_format` check constraint.
 *
 * `live` vs `test` comes from the application, not from `PAYMENT_MODE`: a
 * single deployment can serve a live SaaS and a sandbox one, and the prefix
 * has to describe the money, not the server.
 */
import { randomBytes } from 'node:crypto';

const ENTROPY_BYTES = 32;

export function generateSessionId(isLive: boolean): string {
  const suffix = randomBytes(ENTROPY_BYTES).toString('base64url');
  return `cs_${isLive ? 'live' : 'test'}_${suffix}`;
}

/**
 * Shape check only — says nothing about whether the session exists. Used to
 * reject obvious junk before it reaches a database query.
 */
export function isSessionIdShape(value: string): boolean {
  return /^cs_(live|test)_[A-Za-z0-9_-]{32,}$/.test(value);
}

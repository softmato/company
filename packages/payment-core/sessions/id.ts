/**
 * Session identifiers.
 *
 * The id is the only thing standing between a stranger and a customer's
 * checkout page, so it is 32 bytes of CSPRNG (docs/API.md §3) — base64url'd to
 * 43 characters, which satisfies the `session_id_format` check constraint.
 *
 * `live` vs `test` comes from the credential that opened the session, not from
 * `PAYMENT_MODE`: a single deployment can serve a Production integration and a
 * Sandbox one, and the prefix has to describe the credential, not the server.
 *
 * It is a label. It does not isolate anything — see `AuthenticatedApplication`.
 */
import type { CredentialMode } from '@softmato/db';

import { randomBytes } from 'node:crypto';

const ENTROPY_BYTES = 32;

export function generateSessionId(mode: CredentialMode): string {
  const suffix = randomBytes(ENTROPY_BYTES).toString('base64url');
  return `cs_${mode}_${suffix}`;
}

/**
 * Shape check only — says nothing about whether the session exists. Used to
 * reject obvious junk before it reaches a database query.
 */
export function isSessionIdShape(value: string): boolean {
  return /^cs_(live|test)_[A-Za-z0-9_-]{32,}$/.test(value);
}

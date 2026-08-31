/**
 * One-time enrolment tokens for the "scan this QR" link.
 *
 * A new admin has no TOTP secret yet, so there is no code they could give us
 * and no session they could hold. Possession of this token is what authorises
 * the single act of enrolling — nothing else. It cannot read, write or sign in.
 *
 * ## Why there is no `enrolment_tokens` table
 *
 * Single-use is normally enforced by storing the token and deleting it. Here
 * the signature covers `isActive` and `totpEnabled`, which is state that
 * *necessarily* changes the moment enrolment succeeds:
 *
 *   created   → (isActive false, totpEnabled false)   token valid
 *   enrolled  → (isActive true,  totpEnabled true)    signature no longer matches
 *
 * So the token invalidates itself by doing its job, with no row to clean up and
 * no window where a used token is still live because a delete failed.
 *
 * **The invariant this rests on:** deactivating an admin must set `isActive`
 * false and leave `totpEnabled` true, giving (false, true) — which still does
 * not match a token minted at (false, false). If anything ever clears
 * `totpEnabled` on an existing admin, that admin's original enrolment link
 * comes back to life. The database permits (inactive, totpEnabled true); keep
 * deactivation on that shape.
 */
import { createHmac } from 'node:crypto';

import { timingSafeEquals } from '../crypto.core';

/**
 * Long enough to survive a founder reading email the next morning, short
 * enough that a link forwarded and forgotten in an inbox stops working.
 */
export const ENROLMENT_TTL_MS = 24 * 60 * 60 * 1000;

/** The row state a token is bound to. */
export interface EnrolmentSubject {
  id: number;
  email: string;
  isActive: boolean;
  totpEnabled: boolean;
}

export interface EnrolmentToken {
  token: string;
  expiresAt: Date;
}

function signature(
  subject: EnrolmentSubject,
  expiresAtMs: number,
  secret: string,
): string {
  /*
   * Length-prefixed rather than delimiter-joined. An email cannot contain a
   * newline, but building the habit on the one field a user controls is
   * cheaper than discovering the exception later.
   */
  const material = [
    String(subject.id),
    String(expiresAtMs),
    subject.email,
    subject.isActive ? '1' : '0',
    subject.totpEnabled ? '1' : '0',
  ]
    .map((part) => `${part.length}:${part}`)
    .join('');

  return createHmac('sha256', secret).update(material).digest('base64url');
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set (32+ characters).');
  }

  return secret;
}

export function mintEnrolmentToken(
  subject: EnrolmentSubject,
  now = new Date(),
): EnrolmentToken {
  const expiresAtMs = now.getTime() + ENROLMENT_TTL_MS;

  return {
    token: `${subject.id}.${expiresAtMs}.${signature(subject, expiresAtMs, authSecret())}`,
    expiresAt: new Date(expiresAtMs),
  };
}

/** The admin id a token claims, before any signature check. */
export function claimedAdminId(token: string): number | null {
  const id = Number(token.split('.')[0]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Fails closed. A malformed token, a wrong signature, an expired deadline and
 * an already-enrolled admin are all the same answer — there is nothing useful
 * to tell the holder of a token that does not work, and distinguishing the
 * cases would say whether an account exists.
 */
export function verifyEnrolmentToken(
  token: string,
  subject: EnrolmentSubject,
  now = new Date(),
): boolean {
  /*
   * An enrolled admin is never a valid subject, whatever the signature says.
   *
   * The state-change trick above already kills a token once it is used, but it
   * only holds while nothing mints a token against an active admin — and
   * `mintEnrolmentToken` signs whatever subject it is handed. Rather than leave
   * that as a rule the callers have to remember, refuse here: enrolment is for
   * admins who cannot sign in, and one who can has `/admin/security` instead.
   */
  if (subject.isActive || subject.totpEnabled) return false;

  const [rawId, rawExpiry, provided] = token.split('.');

  if (!rawId || !rawExpiry || !provided) return false;
  if (Number(rawId) !== subject.id) return false;

  const expiresAtMs = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= now.getTime()) {
    return false;
  }

  try {
    return timingSafeEquals(
      provided,
      signature(subject, expiresAtMs, authSecret()),
    );
  } catch {
    return false;
  }
}

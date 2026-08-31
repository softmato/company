import 'server-only';

/**
 * A candidate TOTP secret, held between "here is your QR" and "I scanned it".
 *
 * Neither flow may write the new secret straight to `admin_users`:
 *
 *   - enrolling, it would leave a row claiming an enrolment nobody completed
 *   - rotating, it would break the sign-in the admin still depends on, on a
 *     page they might close before ever scanning
 *
 * So the candidate rides back with the form, sealed with AUTH_SECRET and bound
 * to the admin it was minted for. Round-tripping it through the client is safe
 * because forging a seal needs AUTH_SECRET: the worst a caller can do is
 * replay an envelope we issued to that same admin, inside the TTL — which is
 * what submitting the form does anyway. It cannot choose a secret it knows,
 * and it cannot carry one to another account.
 *
 * The payload is the *encrypted* secret, so the envelope is not plaintext-
 * sensitive even before the signature is checked.
 */
import { createHmac } from 'node:crypto';

import { timingSafeEquals } from '../crypto.core';

/** Long enough to open an authenticator app and wait out a code rollover. */
export const PENDING_TTL_MS = 15 * 60 * 1000;

function seal(adminId: number, encryptedSecret: string, expiresAtMs: number) {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set (32+ characters).');
  }

  return createHmac('sha256', secret)
    .update(
      [String(adminId), String(expiresAtMs), encryptedSecret]
        .map((part) => `${part.length}:${part}`)
        .join(''),
    )
    .digest('base64url');
}

export function sealPendingSecret(
  adminId: number,
  encryptedSecret: string,
  now = new Date(),
): string {
  const expiresAtMs = now.getTime() + PENDING_TTL_MS;

  return [
    String(expiresAtMs),
    seal(adminId, encryptedSecret, expiresAtMs),
    encryptedSecret,
  ].join('|');
}

/**
 * Returns the encrypted secret, or null for anything that does not verify.
 * Fails closed — a cookie that will not open is treated as absent, which sends
 * the user back to a fresh QR rather than into an error.
 */
export function openPendingSecret(
  adminId: number,
  sealed: string | undefined,
  now = new Date(),
): string | null {
  if (!sealed) return null;

  const separator = sealed.indexOf('|');
  const second = sealed.indexOf('|', separator + 1);
  if (separator === -1 || second === -1) return null;

  const rawExpiry = sealed.slice(0, separator);
  const provided = sealed.slice(separator + 1, second);
  // The secret itself may contain no '|', but slice to the end regardless so a
  // format change cannot silently truncate a payload.
  const encryptedSecret = sealed.slice(second + 1);

  const expiresAtMs = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= now.getTime()) {
    return null;
  }

  try {
    const expected = seal(adminId, encryptedSecret, expiresAtMs);
    return timingSafeEquals(provided, expected) ? encryptedSecret : null;
  } catch {
    return null;
  }
}

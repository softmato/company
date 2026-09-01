import 'server-only';

/**
 * The TOTP secret a scan-and-confirm page stands for, derived rather than
 * generated.
 *
 * ## Why derived
 *
 * Both pages that show a TOTP QR are server-rendered, so they re-run on every
 * request: a reload, a back-navigation, a failed submit that re-renders the
 * route, and — on a phone — the ordinary case of switching to the
 * authenticator app and switching back, which routinely evicts the page and
 * reloads it. Generating a fresh random secret per render means the QR someone
 * scanned a moment ago is no longer the secret the form will check, so a
 * correctly typed code is rejected and the handler shows a *third* secret. It
 * presents as "the QR expired within a minute", which is the one thing it is
 * not.
 *
 * Deriving instead makes both pages idempotent: the same page always shows the
 * same QR, so scanning and confirming can happen minutes and several reloads
 * apart with nothing remembered in between.
 *
 * ## How each one stops being valid
 *
 * A derived secret must still be single-use, and neither of these needs a
 * table to manage that. Each derives from state that *necessarily* changes the
 * moment the act it authorises completes — the same self-invalidating trick
 * `token.ts` uses:
 *
 *   - enrolment derives from the token, and the token dies on use
 *   - rotation derives from the secret being replaced, which is replaced
 *
 * So a completed act cannot be replayed, and the page that follows it derives
 * something different.
 *
 * ## What it costs
 *
 * A secret here is recomputable by anyone holding `ENCRYPTION_KEY` *and* the
 * derivation input. `ENCRYPTION_KEY` already decrypts every stored TOTP secret
 * in the table, so that is reachable only inside a compromise that was total
 * either way.
 *
 * Deliberately *not* keyed on `AUTH_SECRET`, which signs enrolment tokens:
 * that would let one leaked value produce both a valid link and the second
 * factor it enrols. The two keys stay independent so both are needed.
 */
import { Secret } from 'otpauth';

import { deriveFromKey } from '../crypto.core';

/** 160 bits, per RFC 4226 — the size `createTotpEnrolment` generates. */
const SECRET_BYTES = 20;

/**
 * `info` is the domain separator, and every caller must pass a distinct
 * prefix: two uses that could ever derive the same bytes would let a secret
 * minted for one act be replayed against the other.
 */
function derived(info: string): string {
  const bytes = deriveFromKey(info);

  /*
   * Copied rather than sliced: `subarray` shares the 32-byte digest's storage,
   * and `Secret` reads the whole underlying ArrayBuffer, not the view.
   */
  return new Secret({
    buffer: new Uint8Array(bytes.subarray(0, SECRET_BYTES)).buffer,
  }).base32;
}

/**
 * The secret an enrolment link enrols.
 *
 * Stable for a given token, and unrelated to what any other token derives.
 * Re-issuing a link therefore rotates the secret, because the new token
 * carries a different expiry.
 */
export function enrolmentSecret(token: string): string {
  return derived(`enrol-totp:v1:${token}`);
}

/**
 * The candidate secret offered to an admin moving to a new authenticator.
 *
 * Bound to the secret being replaced, so it is stable for exactly as long as
 * that one is still in force — through any number of reloads and failed
 * attempts — and becomes something else the instant the rotation commits.
 *
 * The input is the *stored ciphertext*, not the plaintext behind it. It is
 * equally stable, and it keeps the previous secret in plaintext out of a
 * derivation that has no need to see it.
 */
export function rotationSecret(
  adminId: number,
  currentEncryptedSecret: string,
): string {
  return derived(`rotate-totp:v1:${adminId}:${currentEncryptedSecret}`);
}

import 'server-only';

/**
 * Proving it is really you, in front of the acts on this page that a live
 * session alone must not be enough for.
 *
 * Four callers need this now — changing a password, rotating an authenticator,
 * adding an admin, re-issuing an enrolment link — and they all need it to mean
 * exactly the same thing. Written out inline four times it is four chances for
 * one of them to check the password and forget the code, which fails open and
 * looks like nothing.
 *
 * ## What counts
 *
 * The current password **and** a live code from the current authenticator.
 * Both, because the point is not "is there a session" — `requireAdmin` already
 * settled that — it is "is the person at the keyboard the account owner". A
 * borrowed laptop carries the session; it does not carry the phone.
 *
 * ## Why it returns the secret
 *
 * `rotateTotp` needs the very secret it just verified against, to derive the
 * candidate that replaces it. Handing it back from the one query that already
 * read it saves a second read that could, in between, see a different row.
 */
import { eq } from 'drizzle-orm';

import { adminUsers, db } from '@softmato/db';

import { verifyPassword } from '@/lib/password.core';
import { verifyTotp } from '@/lib/totp';

export type Reauth =
  /** Verified. `totpSecret` is the encrypted secret that was checked. */
  | { ok: true; totpSecret: string }
  /** Wrong password, wrong code, or an account in no state to be checked. */
  | { ok: false };

export async function reauthenticate(
  id: number,
  password: string,
  code: string,
): Promise<Reauth> {
  const [user] = await db
    .select({
      passwordHash: adminUsers.passwordHash,
      totpSecret: adminUsers.totpSecret,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  /*
   * No secret means no second factor to check, and this function has exactly
   * one honest answer when it cannot complete a check (docs/RULES.md §5).
   */
  if (!user?.totpSecret) return { ok: false };

  const passwordOk = await verifyPassword(user.passwordHash, password);

  /*
   * The password is verified even when the code is doomed to fail, so the two
   * paths cost the same: argon2 dominates the timing, and skipping it on a bad
   * code would make "wrong code" and "wrong password" distinguishable by clock.
   */
  if (!passwordOk || !verifyTotp(user.totpSecret, code)) return { ok: false };

  return { ok: true, totpSecret: user.totpSecret };
}

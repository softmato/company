'use server';

import { eq } from 'drizzle-orm';

import { adminUsers, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { hashPassword, passwordMinLength, verifyPassword } from '@/lib/password.core';
import { verifyTotp } from '@/lib/totp';

import { requireAdmin } from '../cms/actions/shared';

export interface PasswordResult {
  ok: boolean;
  message?: string;
}

/**
 * Changes the signed-in admin's password.
 *
 * Re-authentication is the current password *and* a current TOTP code — the
 * same bar as signing in. A session cookie alone must not be enough to change
 * the credential that cookie was issued against, or an unattended laptop
 * becomes a permanent account takeover.
 *
 * ## Known limitation
 *
 * Sessions are JWTs with no server-side revocation, so a session issued before
 * the change stays valid until it expires (8 hours). Changing a password
 * therefore does **not** sign other devices out. Fixing that needs a token
 * version on `admin_users` and a check in the jwt callback — a migration, so
 * it is not done here. Until then, treat "someone has my session" as a reason
 * to rotate TOTP as well, which does take effect immediately.
 */
export async function changePassword(
  _previous: PasswordResult | undefined,
  form: FormData,
): Promise<PasswordResult> {
  const adminId = await requireAdmin();
  const id = Number(adminId);

  const current = String(form.get('current_password') ?? '');
  const code = String(form.get('current_code') ?? '');
  const next = String(form.get('new_password') ?? '');
  const confirm = String(form.get('confirm_password') ?? '');

  const minimum = passwordMinLength();

  if (next !== confirm) {
    return { ok: false, message: 'The two new passwords do not match.' };
  }

  if (next.length < minimum) {
    return {
      ok: false,
      message: `A password must be at least ${minimum} characters.`,
    };
  }

  const [user] = await db
    .select({
      passwordHash: adminUsers.passwordHash,
      totpSecret: adminUsers.totpSecret,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!user?.totpSecret) {
    return { ok: false, message: 'Could not verify this account.' };
  }

  const passwordOk = await verifyPassword(user.passwordHash, current);

  if (!passwordOk || !verifyTotp(user.totpSecret, code)) {
    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'admin.password_change_failed',
      resourceType: 'admin_user',
      resourceId: adminId,
      afterState: { reason: 'reauth_failed' },
    });

    return {
      ok: false,
      message:
        'Your current password or code was wrong. Nothing changed.',
    };
  }

  /*
   * Checked after re-authentication, not before: answering "is this my current
   * password?" to someone who has not proved they are the account holder is a
   * free oracle, and this endpoint is reachable with only a session.
   */
  if (next === current) {
    return { ok: false, message: 'That is already your password.' };
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(adminUsers.id, id));

  /*
   * No before/after state. That the password changed, and when, is the
   * auditable fact; the values are exactly what must never reach a log.
   */
  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'admin.password_changed',
    resourceType: 'admin_user',
    resourceId: adminId,
  });

  return {
    ok: true,
    message:
      'Password changed. Sessions already signed in elsewhere stay valid until they expire — rotate your authenticator below too if that is a concern.',
  };
}

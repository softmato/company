'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { adminUsers, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { openPendingSecret } from '@/lib/enrolment/pending';
import { replaceSecret } from '@/lib/enrolment/queries';
import { verifyPassword } from '@/lib/password.core';
import { verifyTotp } from '@/lib/totp';

import { requireAdmin } from '../cms/actions/shared';

export interface RotateResult {
  ok: boolean;
  message?: string;
}

/**
 * Moves an admin's authenticator to a new device.
 *
 * Re-authentication is required even though the caller already holds a valid
 * session: this is the one action that can lock its own owner out, and an
 * unattended laptop should not be enough to perform it. Password *and* a code
 * from the **old** authenticator, so possession of the current device is proven
 * before it stops working.
 *
 * The new secret is only committed after a code from the *new* one verifies —
 * confirming the scan actually landed. Until then the old device keeps working
 * and closing the page changes nothing.
 */
export async function rotateTotp(
  _previous: RotateResult | undefined,
  form: FormData,
): Promise<RotateResult> {
  const adminId = await requireAdmin();
  const id = Number(adminId);

  const password = String(form.get('password') ?? '');
  const currentCode = String(form.get('current') ?? '');
  const newCode = String(form.get('code') ?? '');
  const sealed = String(form.get('pending') ?? '');

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

  const passwordOk = await verifyPassword(user.passwordHash, password);

  if (!passwordOk || !verifyTotp(user.totpSecret, currentCode)) {
    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'admin.totp_rotate_failed',
      resourceType: 'admin_user',
      resourceId: adminId,
      afterState: { reason: 'reauth_failed' },
    });

    return {
      ok: false,
      message:
        'Your password or current code was wrong. Nothing changed — your existing authenticator still works.',
    };
  }

  const encryptedSecret = openPendingSecret(id, sealed);
  if (!encryptedSecret) {
    return {
      ok: false,
      message: 'This page expired before you finished. Reload for a new QR.',
    };
  }

  if (!verifyTotp(encryptedSecret, newCode)) {
    return {
      ok: false,
      message:
        'The code from the new QR did not match. Nothing changed — scan the new QR below and try again.',
    };
  }

  await replaceSecret(id, encryptedSecret);

  /*
   * No before/after state: the values are the secret itself. That an admin
   * rotated, and when, is the auditable fact.
   */
  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'admin.totp_rotated',
    resourceType: 'admin_user',
    resourceId: adminId,
  });

  revalidatePath('/admin/security');

  return {
    ok: true,
    message:
      'Done. Delete the old Softmato entry from your previous authenticator — it no longer produces valid codes.',
  };
}

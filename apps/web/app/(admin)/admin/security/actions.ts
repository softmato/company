'use server';

import { revalidatePath } from 'next/cache';

import { recordAudit } from '@/lib/audit';
import { encryptSecret } from '@/lib/crypto';
import { replaceSecret } from '@/lib/enrolment/queries';
import { rotationSecret } from '@/lib/enrolment/secret';
import { verifyTotp } from '@/lib/totp';

import { requireAdmin } from '../cms/actions/shared';
import { reauthenticate } from './reauth';

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
 *
 * The candidate is re-derived from the secret it replaces rather than carried
 * back from the page, so the code being checked belongs to the QR that was
 * actually scanned however many reloads and failed attempts ago — and stops
 * deriving the moment this succeeds. See `lib/enrolment/secret.ts`.
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

  const me = await reauthenticate(id, password, currentCode);

  if (!me.ok) {
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

  const encryptedSecret = encryptSecret(rotationSecret(id, me.totpSecret));

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

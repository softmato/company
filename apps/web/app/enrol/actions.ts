'use server';

import { redirect } from 'next/navigation';

import { recordAudit } from '@/lib/audit';
import { openPendingSecret } from '@/lib/enrolment/pending';
import { activateWithSecret, findEnrolmentSubject } from '@/lib/enrolment/queries';
import { claimedAdminId, verifyEnrolmentToken } from '@/lib/enrolment/token';
import { verifyTotp } from '@/lib/totp';

/**
 * Completes an enrolment. Everything is re-checked here: the page that rendered
 * the form proved nothing, because this is a POST endpoint reachable without it
 * (the same reason `requireAdmin` re-checks the session rather than trusting
 * the layout).
 *
 * The token is verified against the row's *current* state, so an enrolment that
 * already succeeded cannot be replayed — activating flips the two flags the
 * signature covers. See `lib/enrolment/token.ts`.
 */
export async function confirmEnrolment(form: FormData): Promise<void> {
  const token = String(form.get('token') ?? '');
  const sealed = String(form.get('pending') ?? '');
  const code = String(form.get('code') ?? '');

  const back = `/enrol?token=${encodeURIComponent(token)}&error=1`;

  const id = claimedAdminId(token);
  if (id === null) redirect('/enrol?error=1');

  const subject = await findEnrolmentSubject(id);
  if (!subject || !verifyEnrolmentToken(token, subject)) {
    redirect('/enrol?error=1');
  }

  const encryptedSecret = openPendingSecret(id, sealed);
  if (!encryptedSecret) redirect(back);

  if (!verifyTotp(encryptedSecret, code)) {
    await recordAudit({
      actorType: 'system',
      action: 'admin.enrol_failed',
      resourceType: 'admin_user',
      resourceId: String(id),
      afterState: { reason: 'invalid_totp' },
    });
    redirect(back);
  }

  await activateWithSecret(id, encryptedSecret);

  await recordAudit({
    actorType: 'admin',
    actorId: String(id),
    action: 'admin.enrolled',
    resourceType: 'admin_user',
    resourceId: String(id),
    afterState: { totpEnabled: true, isActive: true },
  });

  redirect('/login?enrolled=1');
}

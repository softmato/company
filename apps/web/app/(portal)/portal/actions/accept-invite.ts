'use server';

import { redirect } from 'next/navigation';

import { recordAudit } from '@/lib/audit';
import { passwordMinLength } from '@/lib/password.core';
import { acceptInvite, findInvitee } from '@/lib/portal/invite';
import { startPortalSession } from '@/lib/portal/session';

export interface AcceptInviteState {
  error?: string;
}

export async function acceptInvitation(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const min = passwordMinLength();

  if (password.length < min) {
    return { error: `Use at least ${min} characters.` };
  }
  if (password.length > 256) {
    return { error: 'Use 256 characters or fewer.' };
  }
  if (password !== confirm) {
    return { error: 'The two passwords do not match. Type them again.' };
  }

  // Re-checked here: the page rendering the form proves nothing about the POST.
  const invitee = await findInvitee(token);
  const userId = invitee ? await acceptInvite(token, password) : null;

  if (!userId) {
    return {
      error:
        'This link has expired or has already been used. Ask your Softmato contact for a new one.',
    };
  }

  await recordAudit({
    actorType: 'client',
    actorId: String(userId),
    action: invitee?.hasPassword
      ? 'portal.password_reset'
      : 'portal.invite_accepted',
    resourceType: 'client_user',
    resourceId: String(userId),
  });

  await startPortalSession(userId);
  redirect('/');
}

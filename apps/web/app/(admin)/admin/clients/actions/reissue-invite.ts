'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';

import { clientUsers, clients, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { idField } from '@/lib/clients/action-kit';
import { issueInvite } from '@/lib/portal/invite';
import { emailInvite } from '@/lib/portal/notify';

import type { InviteState } from './create-client';

/**
 * A fresh link — for an invitation that expired, or a forgotten password.
 * Any earlier link stops working. The current password keeps working until
 * the new link is used.
 */
export async function reissueInviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const adminId = await requireAdmin();
  const userId = idField(formData, 'userId');

  const [person] = userId
    ? await db
        .select({
          id: clientUsers.id,
          clientId: clientUsers.clientId,
          name: clientUsers.name,
          email: clientUsers.email,
          isActive: clientUsers.isActive,
          hasPassword: sql<boolean>`${clientUsers.passwordHash} IS NOT NULL`,
          clientName: clients.name,
        })
        .from(clientUsers)
        .innerJoin(clients, eq(clients.id, clientUsers.clientId))
        .where(eq(clientUsers.id, userId))
        .limit(1)
    : [];

  if (!person) return { error: 'That person could not be found.' };
  if (!person.isActive)
    return { error: 'Reactivate them before sending a link.' };

  const invite = await issueInvite(person.id);

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'client.invite_reissue',
    resourceType: 'client_user',
    resourceId: String(person.id),
  });

  const mail =
    formData.get('send') === 'email'
      ? await emailInvite({
          email: person.email,
          name: person.name,
          clientName: person.clientName,
          url: invite.url,
          expiresAt: invite.expiresAt,
          reset: person.hasPassword,
        })
      : null;

  revalidatePath(`/admin/clients/${person.clientId}`);
  return {
    clientId: person.clientId,
    invite: {
      url: invite.url,
      expiresAt: invite.expiresAt.toISOString(),
      name: person.name,
      email: person.email,
      emailed: mail?.sent,
      emailError: mail && !mail.sent ? mail.reason : undefined,
    },
  };
}

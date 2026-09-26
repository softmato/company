'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { eq } from 'drizzle-orm';

import { clients, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { databaseMessage, field, idField } from '@/lib/clients/action-kit';
import { addClientPerson } from '@/lib/clients/create';
import { issueInvite } from '@/lib/portal/invite';
import { emailInvite } from '@/lib/portal/notify';

import type { InviteState } from './create-client';

const schema = z.object({
  name: z.string().min(1, 'Enter their name.'),
  email: z.string().email('Enter a complete email address.'),
});

/** Another person at the same client — each signs in as themselves. */
export async function addPersonAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const adminId = await requireAdmin();
  const clientId = idField(formData, 'clientId');
  if (!clientId) return { error: 'That client could not be found.' };

  const parsed = schema.safeParse({
    name: field(formData, 'name', 200),
    email: field(formData, 'email', 320).toLowerCase(),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    };

  try {
    const userId = await db.transaction((tx) =>
      addClientPerson(tx, clientId, parsed.data),
    );
    const invite = await issueInvite(userId);

    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'client.person_add',
      resourceType: 'client_user',
      resourceId: String(userId),
      afterState: { clientId, email: parsed.data.email },
    });

    let mail = null;
    if (formData.get('emailInvite') === 'on') {
      const [client] = await db
        .select({ name: clients.name })
        .from(clients)
        .where(eq(clients.id, clientId));
      mail = await emailInvite({
        email: parsed.data.email,
        name: parsed.data.name,
        clientName: client?.name ?? 'Softmato',
        url: invite.url,
        expiresAt: invite.expiresAt,
        reset: false,
      });
    }

    revalidatePath(`/admin/clients/${clientId}`);
    return {
      clientId,
      invite: {
        url: invite.url,
        expiresAt: invite.expiresAt.toISOString(),
        name: parsed.data.name,
        email: parsed.data.email,
        emailed: mail?.sent,
        emailError: mail && !mail.sent ? mail.reason : undefined,
      },
    };
  } catch (error) {
    return { error: databaseMessage(error) };
  }
}

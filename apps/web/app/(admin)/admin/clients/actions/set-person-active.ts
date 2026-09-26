'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { clientUsers, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { done, idField, type FormState } from '@/lib/clients/action-kit';
import { endAllSessionsFor } from '@/lib/portal/session';

/**
 * Turns a person's access off or back on. Off ends their sessions on the
 * spot and voids any open invitation; their messages and files stay.
 */
export async function setPersonActiveAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const userId = idField(formData, 'userId');
  const active = formData.get('active') === 'true';
  if (!userId) return { error: 'That person could not be found.' };

  const [person] = await db
    .update(clientUsers)
    .set(
      active
        ? { isActive: true }
        : { isActive: false, inviteTokenHash: null, inviteExpiresAt: null },
    )
    .where(eq(clientUsers.id, userId))
    .returning({ id: clientUsers.id, clientId: clientUsers.clientId });

  if (!person) return { error: 'That person could not be found.' };
  if (!active) await endAllSessionsFor(person.id);

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: active ? 'client.person_reactivate' : 'client.person_deactivate',
    resourceType: 'client_user',
    resourceId: String(person.id),
  });

  revalidatePath(`/admin/clients/${person.clientId}`);
  return done();
}

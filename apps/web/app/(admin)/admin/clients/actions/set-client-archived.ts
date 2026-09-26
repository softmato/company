'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { clients, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { done, idField, type FormState } from '@/lib/clients/action-kit';

/**
 * Archiving closes the portal for every person at the client at once — the
 * session lookup refuses an archived client — and keeps every record.
 */
export async function setClientArchivedAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const clientId = idField(formData, 'clientId');
  const archive = formData.get('archive') === 'true';
  if (!clientId) return { error: 'That client could not be found.' };

  await db
    .update(clients)
    .set({ archivedAt: archive ? new Date() : null })
    .where(eq(clients.id, clientId));

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: archive ? 'client.archive' : 'client.unarchive',
    resourceType: 'client',
    resourceId: String(clientId),
  });

  revalidatePath('/admin/clients');
  revalidatePath(`/admin/clients/${clientId}`);
  return done();
}

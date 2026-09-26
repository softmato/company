'use server';

import { eq } from 'drizzle-orm';

import { db, projectDeliverables } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';

export async function deleteDeliverableAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const deliverableId = idField(formData, 'deliverableId');
  if (!deliverableId) return { error: 'That deliverable could not be found.' };

  const [deliverable] = await db
    .delete(projectDeliverables)
    .where(eq(projectDeliverables.id, deliverableId))
    .returning({
      projectId: projectDeliverables.projectId,
      title: projectDeliverables.title,
    });
  if (!deliverable) return { error: 'That deliverable could not be found.' };

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.deliverable_delete',
    resourceType: 'project_deliverable',
    resourceId: String(deliverableId),
    beforeState: { title: deliverable.title },
  });

  await touchProject(deliverable.projectId);
  return done();
}

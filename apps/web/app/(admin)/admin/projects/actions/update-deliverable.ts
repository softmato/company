'use server';

import { eq } from 'drizzle-orm';

import { db, projectDeliverables } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  field,
  idField,
  linkField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';
import { notifyReviewRequested } from '@/lib/portal/notify';
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from '@/lib/projects/labels';

/**
 * Edits a deliverable. Sending it back to review clears the previous
 * reviewer, so the client sees a fresh decision to make.
 */
export async function updateDeliverableAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const deliverableId = idField(formData, 'deliverableId');
  const title = field(formData, 'title', 200);
  const description = field(formData, 'description', 2000);
  const linkUrl = linkField(formData, 'linkUrl');
  const status = field(formData, 'status', 30) as DeliverableStatus;

  if (!deliverableId) return { error: 'That deliverable could not be found.' };
  if (!title) return { error: 'Name the deliverable.' };
  if (linkUrl === 'invalid')
    return { error: 'The link must start with https://' };
  if (!DELIVERABLE_STATUSES.includes(status))
    return { error: 'Choose a status.' };

  const [before] = await db
    .select({ status: projectDeliverables.status })
    .from(projectDeliverables)
    .where(eq(projectDeliverables.id, deliverableId));
  if (!before) return { error: 'That deliverable could not be found.' };

  const reopened = status === 'in_review' || status === 'in_progress';

  const [deliverable] = await db
    .update(projectDeliverables)
    .set({
      title,
      description,
      linkUrl,
      status,
      ...(reopened ? { reviewedAt: null, reviewedBy: null } : {}),
    })
    .where(eq(projectDeliverables.id, deliverableId))
    .returning({ projectId: projectDeliverables.projectId });
  if (!deliverable) return { error: 'That deliverable could not be found.' };

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.deliverable_update',
    resourceType: 'project_deliverable',
    resourceId: String(deliverableId),
    afterState: { title, status },
  });

  // Tell the client only when it newly lands in front of them.
  if (status === 'in_review' && before.status !== 'in_review') {
    notifyReviewRequested(deliverable.projectId, title);
  }

  await touchProject(deliverable.projectId);
  return done();
}

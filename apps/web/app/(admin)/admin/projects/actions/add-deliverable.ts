'use server';

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

export async function addDeliverableAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const title = field(formData, 'title', 200);
  const description = field(formData, 'description', 2000);
  const linkUrl = linkField(formData, 'linkUrl');
  const forReview = formData.get('forReview') === 'on';

  if (!projectId) return { error: 'That project could not be found.' };
  if (!title) return { error: 'Name the deliverable.' };
  if (linkUrl === 'invalid')
    return { error: 'The link must start with https://' };

  const [deliverable] = await db
    .insert(projectDeliverables)
    .values({
      projectId,
      title,
      description,
      linkUrl,
      status: forReview ? 'in_review' : 'in_progress',
    })
    .returning({ id: projectDeliverables.id });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.deliverable_add',
    resourceType: 'project_deliverable',
    resourceId: String(deliverable?.id),
    afterState: { projectId, title, forReview },
  });

  if (forReview) notifyReviewRequested(projectId, title);

  await touchProject(projectId);
  return done();
}

'use server';

import { eq } from 'drizzle-orm';

import { db, projectMilestones } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';

export async function deleteMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const milestoneId = idField(formData, 'milestoneId');
  if (!milestoneId) return { error: 'That milestone could not be found.' };

  const [milestone] = await db
    .delete(projectMilestones)
    .where(eq(projectMilestones.id, milestoneId))
    .returning({
      projectId: projectMilestones.projectId,
      title: projectMilestones.title,
    });
  if (!milestone) return { error: 'That milestone could not be found.' };

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.milestone_delete',
    resourceType: 'project_milestone',
    resourceId: String(milestoneId),
    beforeState: { title: milestone.title },
  });

  await touchProject(milestone.projectId);
  return done();
}

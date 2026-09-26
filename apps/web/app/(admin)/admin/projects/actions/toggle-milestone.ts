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

export async function toggleMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const milestoneId = idField(formData, 'milestoneId');
  const reached = formData.get('reached') === 'true';
  if (!milestoneId) return { error: 'That milestone could not be found.' };

  const [milestone] = await db
    .update(projectMilestones)
    .set({ completedAt: reached ? new Date() : null })
    .where(eq(projectMilestones.id, milestoneId))
    .returning({ projectId: projectMilestones.projectId });
  if (!milestone) return { error: 'That milestone could not be found.' };

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: reached ? 'project.milestone_reach' : 'project.milestone_reopen',
    resourceType: 'project_milestone',
    resourceId: String(milestoneId),
  });

  await touchProject(milestone.projectId);
  return done();
}

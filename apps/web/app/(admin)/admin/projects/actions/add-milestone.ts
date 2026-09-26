'use server';

import { db, projectMilestones } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  dateField,
  done,
  field,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';

export async function addMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const title = field(formData, 'title', 200);
  const dueOn = dateField(formData, 'dueOn');

  if (!projectId) return { error: 'That project could not be found.' };
  if (!title) return { error: 'Describe the milestone.' };
  if (dueOn === 'invalid')
    return { error: 'Enter the date as shown in the date picker.' };

  const [milestone] = await db
    .insert(projectMilestones)
    .values({ projectId, title, dueOn })
    .returning({ id: projectMilestones.id });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.milestone_add',
    resourceType: 'project_milestone',
    resourceId: String(milestone?.id),
    afterState: { projectId, title, dueOn },
  });

  await touchProject(projectId);
  return done();
}

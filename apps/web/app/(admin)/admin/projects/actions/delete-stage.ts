'use server';

import { eq } from 'drizzle-orm';

import { db, projectStages } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';

export async function deleteStageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const stageId = idField(formData, 'stageId');
  if (!stageId) return { error: 'That stage could not be found.' };

  const [stage] = await db
    .delete(projectStages)
    .where(eq(projectStages.id, stageId))
    .returning({
      projectId: projectStages.projectId,
      name: projectStages.name,
    });
  if (!stage) return { error: 'That stage could not be found.' };

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.stage_delete',
    resourceType: 'project_stage',
    resourceId: String(stageId),
    beforeState: { name: stage.name },
  });

  await touchProject(stage.projectId);
  return done();
}

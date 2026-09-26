'use server';

import { eq } from 'drizzle-orm';

import { db, projectStages } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  field,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';
import { STAGE_STATUSES, type StageStatus } from '@/lib/projects/labels';

export async function updateStageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const stageId = idField(formData, 'stageId');
  const name = field(formData, 'name', 120);
  const description = field(formData, 'description', 1000);
  const status = field(formData, 'status', 20) as StageStatus;

  if (!stageId) return { error: 'That stage could not be found.' };
  if (!name) return { error: 'Name the stage.' };
  if (!STAGE_STATUSES.includes(status)) return { error: 'Choose a status.' };

  const [before] = await db
    .select({
      status: projectStages.status,
      completedAt: projectStages.completedAt,
    })
    .from(projectStages)
    .where(eq(projectStages.id, stageId));
  if (!before) return { error: 'That stage could not be found.' };

  // Keep the original completion date if it was already done.
  const completedAt =
    status === 'done' ? (before.completedAt ?? new Date()) : null;

  const [stage] = await db
    .update(projectStages)
    .set({ name, description, status, completedAt })
    .where(eq(projectStages.id, stageId))
    .returning({ projectId: projectStages.projectId });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.stage_update',
    resourceType: 'project_stage',
    resourceId: String(stageId),
    beforeState: { status: before.status },
    afterState: { name, status },
  });

  await touchProject(stage!.projectId);
  return done();
}

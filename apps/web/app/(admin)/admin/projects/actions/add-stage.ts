'use server';

import { sql } from 'drizzle-orm';

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

/** Appends a stage to the end of the sequence. */
export async function addStageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const name = field(formData, 'name', 120);
  const description = field(formData, 'description', 1000);

  if (!projectId) return { error: 'That project could not be found.' };
  if (!name) return { error: 'Name the stage.' };

  const [stage] = await db
    .insert(projectStages)
    .values({
      projectId,
      name,
      description,
      position: sql`(SELECT coalesce(max(${projectStages.position}) + 1, 0) FROM ${projectStages} WHERE ${projectStages.projectId} = ${projectId})`,
    })
    .returning({ id: projectStages.id });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.stage_add',
    resourceType: 'project_stage',
    resourceId: String(stage?.id),
    afterState: { projectId, name },
  });

  await touchProject(projectId);
  return done();
}

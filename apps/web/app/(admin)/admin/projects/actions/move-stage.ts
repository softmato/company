'use server';

import { asc, eq } from 'drizzle-orm';

import { db, projectStages } from '@softmato/db';

import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';

/**
 * Moves a stage one place up or down, then renumbers the whole sequence
 * 0..n-1 so positions never drift into duplicates.
 */
export async function moveStageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const stageId = idField(formData, 'stageId');
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  if (!stageId) return { error: 'That stage could not be found.' };

  const projectId = await db.transaction(async (tx) => {
    const [stage] = await tx
      .select({ projectId: projectStages.projectId })
      .from(projectStages)
      .where(eq(projectStages.id, stageId));
    if (!stage) return null;

    const ordered = await tx
      .select({ id: projectStages.id })
      .from(projectStages)
      .where(eq(projectStages.projectId, stage.projectId))
      .orderBy(asc(projectStages.position), asc(projectStages.id));

    const ids = ordered.map((s) => s.id);
    const from = ids.indexOf(stageId);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return stage.projectId;

    [ids[from], ids[to]] = [ids[to]!, ids[from]!];

    for (const [position, id] of ids.entries()) {
      await tx
        .update(projectStages)
        .set({ position })
        .where(eq(projectStages.id, id));
    }
    return stage.projectId;
  });

  if (!projectId) return { error: 'That stage could not be found.' };

  await touchProject(projectId);
  return done();
}

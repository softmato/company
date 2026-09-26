'use server';

import { redirect } from 'next/navigation';

import { db, projectStages, projects } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  databaseMessage,
  dateField,
  field,
  idField,
  type FormState,
} from '@/lib/clients/action-kit';

/** The usual shape of an agency project; edited freely afterwards. */
const STANDARD_STAGES = ['Discovery', 'Design', 'Build', 'Testing', 'Launch'];

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const clientId = idField(formData, 'clientId');
  const name = field(formData, 'name', 200);
  const summary = field(formData, 'summary', 4000);
  const startsOn = dateField(formData, 'startsOn');
  const dueOn = dateField(formData, 'dueOn');
  const withStages = formData.get('standardStages') === 'on';

  if (!clientId) return { error: 'That client could not be found.' };
  if (!name) return { error: 'Give the project a name.' };
  if (startsOn === 'invalid' || dueOn === 'invalid')
    return { error: 'Enter dates as shown in the date picker.' };

  let projectId: number;
  try {
    projectId = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ clientId, name, summary, startsOn, dueOn })
        .returning({ id: projects.id });

      if (withStages) {
        await tx.insert(projectStages).values(
          STANDARD_STAGES.map((stage, position) => ({
            projectId: project!.id,
            position,
            name: stage,
          })),
        );
      }

      await recordAudit(
        {
          actorType: 'admin',
          actorId: adminId,
          action: 'project.create',
          resourceType: 'project',
          resourceId: String(project!.id),
          afterState: { clientId, name },
        },
        tx,
      );

      return project!.id;
    });
  } catch (error) {
    return { error: databaseMessage(error) };
  }

  redirect(`/admin/projects/${projectId}`);
}

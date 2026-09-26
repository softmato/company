'use server';

import { after } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, projects } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  databaseMessage,
  dateField,
  done,
  field,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/projects/labels';
import { previewHost, slugProblem } from '@/lib/projects/preview';
import { claimPreviewDomain } from '@/lib/projects/vercel-domain';

export async function updateProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const name = field(formData, 'name', 200);
  const summary = field(formData, 'summary', 4000);
  const status = field(formData, 'status', 20) as ProjectStatus;
  const startsOn = dateField(formData, 'startsOn');
  const dueOn = dateField(formData, 'dueOn');
  const previewSlug = field(formData, 'previewSlug', 63).toLowerCase() || null;

  if (!projectId) return { error: 'That project could not be found.' };
  if (!name) return { error: 'Give the project a name.' };
  if (!PROJECT_STATUSES.includes(status)) return { error: 'Choose a status.' };
  if (startsOn === 'invalid' || dueOn === 'invalid')
    return { error: 'Enter dates as shown in the date picker.' };
  const slugError = previewSlug ? slugProblem(previewSlug) : null;
  if (slugError) return { error: slugError };

  try {
    await db
      .update(projects)
      .set({ name, summary, status, startsOn, dueOn, previewSlug })
      .where(eq(projects.id, projectId));
  } catch (error) {
    return { error: databaseMessage(error) };
  }

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.update',
    resourceType: 'project',
    resourceId: String(projectId),
    afterState: { name, status, startsOn, dueOn, previewSlug },
  });

  // Idempotent, so every save re-claims it; a failure is logged, not shown —
  // the address can still be added by hand in Vercel.
  if (previewSlug) after(() => claimPreviewDomain(previewHost(previewSlug)));

  await touchProject(projectId);
  return done();
}

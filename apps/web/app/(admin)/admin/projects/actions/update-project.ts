'use server';

import { eq } from 'drizzle-orm';

import { db, projects } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import { env } from '@/lib/env';
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
import {
  previewHost,
  slugProblem,
  VERCEL_PROJECT_ID,
} from '@/lib/projects/preview';
import {
  claimNotice,
  claimPreviewDomain,
  hostingProject,
} from '@/lib/projects/vercel-domain';

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
  const vercelProjectId = field(formData, 'vercelProjectId', 64) || null;

  if (!projectId) return { error: 'That project could not be found.' };
  if (!name) return { error: 'Give the project a name.' };
  if (!PROJECT_STATUSES.includes(status)) return { error: 'Choose a status.' };
  if (startsOn === 'invalid' || dueOn === 'invalid')
    return { error: 'Enter dates as shown in the date picker.' };
  const slugError = previewSlug ? slugProblem(previewSlug) : null;
  if (slugError) return { error: slugError };
  if (vercelProjectId && !VERCEL_PROJECT_ID.test(vercelProjectId))
    return {
      error:
        'The Vercel project id starts with prj_ — copy it from the project’s Settings → General.',
    };
  // Linking this app's own project would email the client on every Softmato deploy.
  if (vercelProjectId && vercelProjectId === env.VERCEL_PROJECT_ID)
    return {
      error:
        'That is Softmato’s own Vercel project — leave it blank for a preview built in this app.',
    };

  try {
    await db
      .update(projects)
      .set({
        name,
        summary,
        status,
        startsOn,
        dueOn,
        previewSlug,
        vercelProjectId,
      })
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
    afterState: {
      name,
      status,
      startsOn,
      dueOn,
      previewSlug,
      vercelProjectId,
    },
  });

  await touchProject(projectId);

  // Every save re-checks it, so a domain removed in Vercel comes back; what
  // Vercel says is shown, because the admin is the one who can fix it there.
  const hostedOn = previewSlug
    ? hostingProject(previewSlug, vercelProjectId)
    : null;
  if (!previewSlug || !hostedOn) return done();

  const host = previewHost(previewSlug);
  const notice = claimNotice(await claimPreviewDomain(host, hostedOn), host);
  return notice ? { ...done(), error: notice } : done();
}

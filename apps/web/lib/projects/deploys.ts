/**
 * Recording a client site's production deploys against its project.
 *
 * GitHub's deployment webhook reports them (`app/api/webhooks/github`), and
 * each is recorded once, keyed on Vercel's deployment id — so a redelivered
 * or repeated event finds it already there and emails nobody twice.
 */
import 'server-only';
import { eq } from 'drizzle-orm';

import { db, projectDeployments, projects } from '@softmato/db';

import { touchProject } from '@/lib/clients/action-kit';
import { notifyClientOfDeploy } from '@/lib/portal/notify';

export interface Deploy {
  deploymentId: string;
  /** First line of the commit message; empty when there was none. */
  summary: string;
  deployedAt: Date;
}

/**
 * Only a deploy this recent is news. An older one — a delivery redone by hand
 * from GitHub much later — is recorded without an email.
 */
const FRESH_MS = 30 * 60_000;

export async function projectForVercel(
  vercelProjectId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.vercelProjectId, vercelProjectId))
    .limit(1);
  return row?.id ?? null;
}

/** How many of `deploys` were new. One email at most, for the newest. */
export async function recordDeploys(
  projectId: number,
  deploys: Deploy[],
  now = Date.now(),
): Promise<number> {
  if (deploys.length === 0) return 0;

  const added = await db
    .insert(projectDeployments)
    .values(
      deploys.map((d) => ({
        projectId,
        vercelDeploymentId: d.deploymentId,
        summary: d.summary,
        deployedAt: d.deployedAt,
      })),
    )
    .onConflictDoNothing({ target: projectDeployments.vercelDeploymentId })
    .returning({
      summary: projectDeployments.summary,
      deployedAt: projectDeployments.deployedAt,
    });
  if (added.length === 0) return 0;

  await touchProject(projectId);

  const newest = added.reduce((a, b) => (b.deployedAt > a.deployedAt ? b : a));
  if (now - newest.deployedAt.getTime() < FRESH_MS)
    notifyClientOfDeploy(projectId, newest.summary);

  return added.length;
}

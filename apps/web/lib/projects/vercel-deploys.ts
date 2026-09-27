/**
 * Which production deploys a commit became, asked of Vercel.
 *
 * GitHub tells us "a production deploy of <sha> succeeded" but not which
 * Vercel project it was or what the commit said; one call here answers both.
 * It runs only when GitHub reports a deploy — nothing polls.
 */
import 'server-only';

import type { Deploy } from './deploys';
import { vercelConfigured, vercelFetch } from './vercel-api';

/** A commit message's first line — the title the client sees. */
export function commitSummary(message: unknown): string {
  return typeof message === 'string'
    ? (message.split('\n')[0] ?? '').trim().slice(0, 200)
    : '';
}

interface Listing {
  uid?: unknown;
  projectId?: unknown;
  created?: unknown;
  ready?: unknown;
  meta?: { githubCommitMessage?: unknown };
}

export async function productionDeploysOf(
  sha: string,
): Promise<{ vercelProjectId: string; deploy: Deploy }[]> {
  if (!vercelConfigured()) return [];

  const response = await vercelFetch(
    `/v7/deployments?sha=${encodeURIComponent(sha)}&target=production&state=READY&limit=10`,
  );
  if (!response.ok) {
    console.error('[deploys] Vercel refused the lookup', sha, response.status);
    return [];
  }

  const body = (await response.json()) as { deployments?: Listing[] };
  return (body.deployments ?? []).flatMap((d) =>
    typeof d.uid === 'string' &&
    typeof d.projectId === 'string' &&
    typeof d.created === 'number'
      ? [
          {
            vercelProjectId: d.projectId,
            deploy: {
              deploymentId: d.uid,
              summary: commitSummary(d.meta?.githubCommitMessage),
              deployedAt: new Date(
                typeof d.ready === 'number' ? d.ready : d.created,
              ),
            },
          },
        ]
      : [],
  );
}

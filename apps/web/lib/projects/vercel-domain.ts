/**
 * Registers a preview host with this Vercel project.
 *
 * `*.softmato.com` is a wildcard CNAME in Cloudflare, so every preview name
 * already resolves to Vercel — but Vercel answers `DEPLOYMENT_NOT_FOUND` until
 * a project claims the exact host. (A wildcard *domain* on Vercel needs Vercel's
 * nameservers, which softmato.com does not use.) Saving a preview address calls
 * this so nobody has to visit the Vercel dashboard.
 */
import 'server-only';

import { env } from '@/lib/env';

export type DomainClaim = 'added' | 'already' | 'skipped' | 'failed';

export async function claimPreviewDomain(host: string): Promise<DomainClaim> {
  const token = env.VERCEL_API_TOKEN;
  const project = env.VERCEL_PROJECT_ID;

  if (!token || !project) return 'skipped';

  const team = env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}`
    : '';

  try {
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains${team}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: host }),
      },
    );

    if (response.ok) return 'added';

    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    if (
      response.status === 409 ||
      body?.error?.code === 'domain_already_in_use'
    )
      return 'already';

    console.error(
      '[preview] Vercel refused the domain',
      host,
      response.status,
      body?.error?.code,
    );
    return 'failed';
  } catch (error) {
    console.error('[preview] Vercel unreachable', host, error);
    return 'failed';
  }
}

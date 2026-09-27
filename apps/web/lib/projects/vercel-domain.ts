/**
 * Registers a preview host with the Vercel project that serves it.
 *
 * `*.softmato.com` is a wildcard CNAME in Cloudflare, so every preview name
 * already resolves to Vercel — but Vercel answers `DEPLOYMENT_NOT_FOUND` until
 * a project claims the exact host. (A wildcard *domain* on Vercel needs Vercel's
 * nameservers, which softmato.com does not use.) Saving a preview address calls
 * this so nobody has to visit the Vercel dashboard.
 */
import 'server-only';

import { env } from '@/lib/env';

import { IN_APP_PREVIEWS } from './preview';
import { vercelConfigured, vercelFetch } from './vercel-api';

export type DomainClaim =
  | 'added'
  | 'already'
  /** On the project, but Vercel wants a TXT record before it serves it. */
  | 'unverified'
  /** Another Vercel project holds it. */
  | 'taken'
  | 'skipped'
  | 'failed';

/**
 * The Vercel project a preview belongs on: the client site's own project, or
 * Softmato's for a preview built inside this app. Null when it is hosted
 * somewhere this app cannot know about — claiming it here would take the
 * address away from the project that actually serves it.
 */
export function hostingProject(
  slug: string,
  vercelProjectId: string | null,
): string | null {
  if (vercelProjectId) return vercelProjectId;
  return IN_APP_PREVIEWS.has(slug) ? (env.VERCEL_PROJECT_ID ?? null) : null;
}

export async function claimPreviewDomain(
  host: string,
  project: string,
): Promise<DomainClaim> {
  if (!vercelConfigured()) return 'skipped';

  const base = `/projects/${encodeURIComponent(project)}/domains`;

  try {
    const added = await vercelFetch(`/v10${base}`, {
      method: 'POST',
      body: JSON.stringify({ name: host }),
    });
    if (added.ok) {
      const body = (await added.json()) as { verified?: boolean };
      return body.verified === false ? 'unverified' : 'added';
    }

    // Vercel answers 400 when the host is already on this project, and 409
    // when it is on another — so ask rather than read meaning into a status.
    const existing = await vercelFetch(
      `/v9${base}/${encodeURIComponent(host)}`,
    );
    if (existing.ok) {
      const body = (await existing.json()) as { verified?: boolean };
      return body.verified === false ? 'unverified' : 'already';
    }
    if (added.status === 409) return 'taken';

    console.error('[preview] Vercel refused the domain', host, added.status);
    return 'failed';
  } catch (error) {
    console.error('[preview] Vercel unreachable', host, error);
    return 'failed';
  }
}

/** What the admin is told after saving, or null when there is nothing to say. */
export function claimNotice(claim: DomainClaim, host: string): string | null {
  switch (claim) {
    case 'unverified':
      return `Saved. Vercel added ${host} but wants it verified — open Domains in that Vercel project.`;
    case 'taken':
      return `Saved. ${host} is on another Vercel project — remove it there, then save again.`;
    case 'failed':
      return `Saved. Vercel did not accept ${host} — add it in the Vercel project's Domains.`;
    default:
      return null;
  }
}

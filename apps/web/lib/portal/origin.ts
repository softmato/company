/**
 * The client portal's own origin: the `client.` host beside whatever host the
 * site is on.
 *
 *   http://localhost:3000         → http://client.localhost:3000
 *   https://softmato.com          → https://client.softmato.com
 *   https://www.softmato.com      → https://client.softmato.com
 *   http://admin.localhost:3000   → http://client.localhost:3000
 *
 * The portal is served only there, at clean paths (`/projects/7`, not
 * `/portal/projects/7`); `proxy.ts` rewrites them onto the `(portal)` routes
 * and sends any `/portal/…` request on another host to this origin.
 *
 * Pure — the proxy, the invitation links and the demo script share it.
 */
export const SURFACE_LABELS = new Set([
  'www',
  'admin',
  'payment',
  'client',
  /** The portal's first host; `proxy.ts` sends it on to `client.`. */
  'agency',
  'developer',
  'developers',
]);

/** The leftmost label of the portal's host. */
export const PORTAL_LABEL = 'client';

export function portalOrigin(siteUrl: string): string {
  const url = new URL(siteUrl);
  const labels = url.hostname.split('.');

  if (labels.length > 1 && SURFACE_LABELS.has(labels[0] ?? '')) labels.shift();

  return `${url.protocol}//${PORTAL_LABEL}.${labels.join('.')}${url.port ? `:${url.port}` : ''}`;
}

/**
 * Hosts with no `client.` sibling to send anyone to. A Vercel preview lives on
 * one `*.vercel.app` label, and a wildcard certificate covers exactly one.
 */
export function hasPortalHost(hostname: string): boolean {
  return !hostname.endsWith('.vercel.app');
}

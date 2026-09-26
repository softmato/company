/**
 * The client portal's own origin: the `agency.` host beside whatever host the
 * site is on.
 *
 *   http://localhost:3000         → http://agency.localhost:3000
 *   https://softmato.com          → https://agency.softmato.com
 *   https://www.softmato.com      → https://agency.softmato.com
 *   http://admin.localhost:3000   → http://agency.localhost:3000
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
  'agency',
  'developer',
  'developers',
]);

export function agencyOrigin(siteUrl: string): string {
  const url = new URL(siteUrl);
  const labels = url.hostname.split('.');

  if (labels.length > 1 && SURFACE_LABELS.has(labels[0] ?? '')) labels.shift();

  return `${url.protocol}//agency.${labels.join('.')}${url.port ? `:${url.port}` : ''}`;
}

/**
 * Hosts with no `agency.` sibling to send anyone to. A Vercel preview lives on
 * one `*.vercel.app` label, and a wildcard certificate covers exactly one.
 */
export function hasAgencyHost(hostname: string): boolean {
  return !hostname.endsWith('.vercel.app');
}

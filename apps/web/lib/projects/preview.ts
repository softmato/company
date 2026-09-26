/**
 * Where a client watches their site being built: `<slug>.softmato.com`.
 *
 * The site itself is hosted wherever it is built (its own deployment, with
 * `<slug>.softmato.com` added as a domain there); Softmato only records the
 * slug and frames the address in the portal. The address is the production
 * one in every environment, because the preview is a real site either way.
 */
import { SURFACE_LABELS } from '@/lib/portal/origin';

export const PREVIEW_DOMAIN = 'softmato.com';

/** Labels the company's own hosts use, plus ones that read as ours. */
const RESERVED = new Set([
  ...SURFACE_LABELS,
  'api',
  'app',
  'mail',
  'docs',
  'status',
  'preview',
  'softmato',
]);

/** One DNS label: lowercase letters, digits and inner hyphens, 1–63 long. */
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** `Himalayan Tea Co.` → `himalayan-tea-co`, as a suggestion for the form. */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/, '');
}

/** Why a slug cannot be used, or null when it can. */
export function slugProblem(slug: string): string | null {
  if (!LABEL.test(slug))
    return 'Use lowercase letters, numbers and hyphens only, not starting or ending with a hyphen.';
  if (RESERVED.has(slug))
    return `${slug}.${PREVIEW_DOMAIN} is one of Softmato's own addresses.`;
  return null;
}

export function previewHost(slug: string): string {
  return `${slug}.${PREVIEW_DOMAIN}`;
}

/**
 * The preview's address beside a given site: `https://<slug>.softmato.com` in
 * production, `http://<slug>.localhost:3000` beside a local one.
 */
export function previewUrl(
  slug: string,
  siteUrl = `https://${PREVIEW_DOMAIN}`,
): string {
  const url = new URL(siteUrl);
  const labels = url.hostname.split('.');

  if (labels.length > 1 && SURFACE_LABELS.has(labels[0] ?? '')) labels.shift();

  return `${url.protocol}//${slug}.${labels.join('.')}${url.port ? `:${url.port}` : ''}`;
}

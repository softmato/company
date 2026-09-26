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

export function previewUrl(slug: string): string {
  return `https://${previewHost(slug)}`;
}

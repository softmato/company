/**
 * The services chapter's illustration and short points, per service slug.
 *
 * **The art** is founder-supplied (rendered to the prompts in the 2026-09-25
 * session, trimmed to its ink and saved at 1100px in `public/home/services/`).
 * The web image's browser bar had a red window dot, the one colour outside the
 * palette; it was recoloured to `--cobalt` when saved.
 *
 * **The points** are three short lines each, paraphrasing the service's own
 * CMS body (`packages/db/seed/marketing/services.ts`) — the same rule as
 * `statements.ts`: a summary of founder-edited copy, never a new claim. If a
 * service's body changes, change its points with it.
 *
 * Keyed by slug, not index: an index cycle once put the apps service beside a
 * picture of a website. **An entry here is also what puts a service in the
 * services chapter at all** — `ServicesSection` shows only services with art,
 * and the service cards lower down list the rest.
 */
export interface ServiceArt {
  src: string;
  width: number;
  height: number;
  points: [string, string, string];
}

const ART: Record<string, ServiceArt> = {
  'product-engineering': {
    src: '/home/services/product-engineering.webp',
    width: 1100,
    height: 758,
    points: [
      'A written scope for every stage',
      'Working software to look at every week',
      'Launched, watched and fixed after',
    ],
  },
  'web-applications': {
    src: '/home/services/web-applications.webp',
    width: 1100,
    height: 565,
    points: [
      'Fits the process you already have',
      'Roles and permissions done properly',
      'Your data and your source code',
    ],
  },
  'mobile-apps': {
    src: '/home/services/mobile-apps.webp',
    width: 1100,
    height: 895,
    points: [
      'iOS and Android from one codebase',
      'Works offline, syncs when back',
      'The server and admin behind it',
    ],
  },
};

export function serviceArtFor(slug: string): ServiceArt | null {
  return ART[slug] ?? null;
}

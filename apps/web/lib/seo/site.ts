import 'server-only';

import { env } from '@/lib/env';

/**
 * The facts about this site that every SEO surface needs, in one place.
 *
 * Metadata, JSON-LD, the sitemap and robots.txt all have to agree on the
 * origin and on how the company names itself. When they disagree, a crawler
 * sees two sites — `softmato.com` and `www.softmato.com`, or `Softmato` and
 * `Softmato Technology Pvt Ltd` as separate entities — and splits the ranking
 * signal between them. So they read from here rather than each holding their
 * own copy.
 *
 * **Nothing in this file may state a fact the founder has not given.** No
 * founding date, no headcount, no ratings, no revenue. Contact details are not
 * here either: they live in platform settings, are blank until filled in, and
 * are read at request time by ./organization.ts.
 */

/** The short name. What a person calls us, and what belongs in a title bar. */
export const SITE_NAME = 'Softmato';

/** The registered name. Used once, in the Organization's `legalName`. */
export const LEGAL_NAME = 'Softmato Technology Pvt Ltd';

/**
 * The one-line description of the company, and the tagline that follows the
 * name in a title.
 *
 * **Both are copied from the `home` page's seeded `metaTitle` and
 * `metaDescription`, word for word.** That is not laziness — it is the only
 * copy on this site that has been through the founder, and a search result
 * that disagrees with the page it points at is a worse result. When the
 * founder edits the home page in the admin panel, the home page's own metadata
 * follows immediately; these constants are the fallback for the handful of
 * routes with no CMS row behind them, and should be brought back into line
 * when that copy changes.
 *
 * Nothing here may grow a claim the seeded copy does not make. No client
 * names, no headcount, no founding year, no "leading" or "best".
 */
export const SITE_TAGLINE =
  'software products and project work, built in Nepal';

export const SITE_DESCRIPTION =
  'A Nepali software company in Kathmandu. We build and run our own products, ' +
  'and take on project work for companies who need software that lasts.';

/** The full title for the home page and for any route without its own. */
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/**
 * The generated social card at app/opengraph-image.tsx.
 *
 * Referenced explicitly rather than left to Next's file-convention merge. That
 * merge only fills in `openGraph.images` for a segment that has not declared
 * an `openGraph` object of its own — and every public page here declares one
 * through `metadataFor`, so the implicit path produced no `og:image` at all,
 * on any page, with nothing in the build output to say so.
 *
 * Relative on purpose: `metadataBase` in the root layout resolves it to an
 * absolute URL, which is the only form a social scraper accepts.
 */
export const DEFAULT_OG_IMAGE = '/opengraph-image';

/** The origin, with any trailing slash removed so joins never double up. */
export function origin(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

/**
 * Absolute site URL, for canonical links, the sitemap and JSON-LD `@id`s.
 *
 * Absolute is not optional in those three places: a relative canonical is
 * ignored by some crawlers, and a relative `@id` cannot be a stable identity
 * for an entity that other pages point at.
 */
export function siteUrl(path = '/'): string {
  const suffix = path === '/' ? '' : path;
  return `${origin()}${suffix}`;
}

/**
 * Whether this deployment is the real site.
 *
 * Indexing and structured data are both gated on it. A preview deployment that
 * emits Organization markup is telling Google the company lives at a Vercel
 * preview URL, which is the same mistake robots.ts already guards against.
 */
export function isProductionSite(): boolean {
  return env.APP_ENV === 'production';
}

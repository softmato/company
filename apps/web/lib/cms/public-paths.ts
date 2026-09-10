import type { ContentKindSlug } from './registry';

/**
 * Which public routes a content kind is rendered into.
 *
 * Every public page reads the database directly and touches no dynamic API, so
 * Next prerenders all of them at build time and freezes the query result into
 * the HTML — `/team` and its siblings answer with `X-Nextjs-Prerender: 1` and
 * no `initialRevalidateSeconds`. Nothing re-runs those queries on its own, so
 * an edit saved in the admin panel stays invisible on the site until the next
 * deploy unless something purges the path. The admin actions are the only code
 * that knows an edit happened; this is the map they purge through.
 *
 * The failure it exists to prevent is not hypothetical. A founder's photograph
 * sat in the production database for a day while /team served the initials
 * tile beside their name, and the other founder's photo rendered perfectly on
 * the same page — because that one had been uploaded before the last build.
 *
 * Kept beside the registry rather than inside the actions, and typed as an
 * exhaustive record: a new content kind does not compile until someone has
 * said where it appears.
 */

/**
 * The route a `pages` row is the copy for.
 *
 * `home` is the site root, not `/home` — these rows are named after the page
 * they fill, and the home page's route is `/`. The sitemap builds its URLs
 * through this same function, so the two cannot come to disagree about where a
 * page lives.
 */
export function pagePath(slug: string): string {
  return slug === 'home' ? '/' : `/${slug}`;
}

/**
 * Routes rendered from a kind's rows.
 *
 * A detail route is listed by its pattern (`/blog/[slug]`) rather than by the
 * edited row's own path. `revalidatePath(pattern, 'page')` purges every
 * instance of it, which is what two ordinary cases both need: a renamed slug,
 * which leaves the old path serving copy that has moved, and a page that
 * cross-links its siblings — each legal document lists the *other* published
 * policies, so publishing one changes all of them.
 *
 * The cost is purging siblings that did not change. At a handful of rows per
 * kind that is cheaper than tracking which ones did; revisit it if the blog
 * ever runs to hundreds of posts.
 *
 * `pages` is deliberately empty. Each of its rows is a separate static route
 * rather than one dynamic route, so its paths are added per row below.
 */
const KIND_ROUTES: Record<ContentKindSlug, readonly string[]> = {
  pages: [],
  blog: ['/blog', '/blog/[slug]'],
  team: ['/team'],
  services: ['/services', '/services/[slug]'],
  products: ['/products', '/products/[slug]'],
  legal: ['/legal/[slug]'],
};

/**
 * Kinds the sitemap lists, so an edit that adds or removes a URL updates it.
 *
 * The sitemap is prerendered like everything else, and a stale one advertises
 * URLs that have gone and hides ones that have arrived.
 *
 * Team members are absent on purpose: a person is not a URL. The team *page*
 * is in the sitemap, but as a `pages` row, and its `lastModified` comes from
 * that row rather than from anyone listed on it.
 */
const SITEMAP_KINDS: ReadonlySet<ContentKindSlug> = new Set([
  'pages',
  'blog',
  'services',
  'products',
  'legal',
]);

/**
 * Every public path an edit to `kind` can change.
 *
 * `slugs` are the affected `pages` slugs and are ignored for every other kind.
 * Pass the old one as well as the new one wherever a slug can be edited: a
 * rename moves the copy and leaves the page at the old path stale.
 *
 * A path containing `[` is a route pattern and needs `'page'` as the second
 * argument to `revalidatePath`; see `revalidateContent`.
 */
export function publicPathsFor(
  kind: ContentKindSlug,
  slugs: readonly (string | undefined)[] = [],
): string[] {
  const paths = new Set<string>(KIND_ROUTES[kind]);

  if (kind === 'pages') {
    for (const slug of slugs) {
      if (slug) paths.add(pagePath(slug));
    }
  }

  if (SITEMAP_KINDS.has(kind)) paths.add('/sitemap.xml');

  return [...paths];
}

/**
 * A content row's slug, for the kinds that have one.
 *
 * `ContentRow` is `Record<string, unknown>` — one type covering six tables,
 * only five of which have a slug column at all — so this narrows rather than
 * asserting.
 */
export function rowSlug(
  row: Record<string, unknown> | null | undefined,
): string | undefined {
  return typeof row?.slug === 'string' ? row.slug : undefined;
}

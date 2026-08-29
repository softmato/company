import 'server-only';

import { siteUrl } from './site';

/**
 * Breadcrumb structured data.
 *
 * This is the one piece of markup here with a visible payoff: Google replaces
 * the green URL line in a result with the trail, so `/services/mobile-apps`
 * renders as "Softmato › Services › Mobile apps". On a deep page that is the
 * difference between a result that looks like a stray file and one that looks
 * like part of a site.
 *
 * The trail must match what the page actually links to. A crumb pointing at a
 * URL the user cannot reach from the page is the usual reason this markup gets
 * ignored, so every caller passes real, published paths.
 */

export interface Crumb {
  name: string;
  /** Site-relative, leading slash. Omit on the final crumb. */
  path?: string;
}

/**
 * Builds the list with Home prepended.
 *
 * The last item deliberately carries no `item`: it is the page the reader is
 * already on, and a self-referential link in the trail is what makes Google
 * drop the whole breadcrumb.
 */
export function breadcrumbList(crumbs: Crumb[]) {
  const all: Crumb[] = [{ name: 'Home', path: '/' }, ...crumbs];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(index < all.length - 1 && crumb.path
        ? { item: siteUrl(crumb.path) }
        : {}),
    })),
  };
}

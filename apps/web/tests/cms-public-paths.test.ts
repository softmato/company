/**
 * The map from a content kind to the public routes it is rendered into.
 *
 * These pages are prerendered at build and never re-query on their own, so a
 * kind missing from the map is content that silently never reaches the site —
 * which is exactly how a founder's photograph sat in the database for a day
 * while /team served the initials tile beside their name.
 */
import { describe, expect, test } from 'vitest';

import { CONTENT_KINDS, type ContentKindSlug } from '@/lib/cms/registry';
import { pagePath, publicPathsFor, rowSlug } from '@/lib/cms/public-paths';

const KINDS = Object.keys(CONTENT_KINDS) as ContentKindSlug[];

describe('every content kind reaches the public site', () => {
  test.each(KINDS)('%s purges at least one public path', (kind) => {
    // `pages` is per row, so give it one; the rest ignore the argument.
    const paths = publicPathsFor(kind, ['about']);
    expect(paths.length).toBeGreaterThan(0);
  });

  test.each(KINDS)('%s purges no path twice', (kind) => {
    const paths = publicPathsFor(kind, ['about', 'about']);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('the routes each kind is rendered into', () => {
  test('team is the team page, and is not a sitemap URL', () => {
    expect(publicPathsFor('team')).toEqual(['/team']);
  });

  test('a kind with a detail route purges the pattern, not one slug', () => {
    expect(publicPathsFor('blog')).toContain('/blog/[slug]');
    expect(publicPathsFor('services')).toContain('/services/[slug]');
    expect(publicPathsFor('products')).toContain('/products/[slug]');
    expect(publicPathsFor('legal')).toContain('/legal/[slug]');
  });

  test('a detail route brings its index with it', () => {
    expect(publicPathsFor('blog')).toContain('/blog');
    expect(publicPathsFor('services')).toContain('/services');
    expect(publicPathsFor('products')).toContain('/products');
  });

  test('a kind that changes which URLs exist purges the sitemap', () => {
    for (const kind of [
      'pages',
      'blog',
      'services',
      'products',
      'legal',
    ] as const) {
      expect(publicPathsFor(kind, ['about'])).toContain('/sitemap.xml');
    }
  });
});

describe('pages are routes, one per row', () => {
  test('home is the site root', () => {
    expect(pagePath('home')).toBe('/');
    expect(publicPathsFor('pages', ['home'])).toContain('/');
  });

  test('every other slug is its own path', () => {
    expect(pagePath('about')).toBe('/about');
    expect(publicPathsFor('pages', ['team'])).toContain('/team');
  });

  /*
   * The case the old code could not have handled at all: a renamed page leaves
   * the route it came from serving copy that has moved.
   */
  test('a rename purges both the old path and the new one', () => {
    const paths = publicPathsFor('pages', ['careers', 'jobs']);
    expect(paths).toContain('/careers');
    expect(paths).toContain('/jobs');
  });

  test('a slug that is missing is skipped rather than becoming "/undefined"', () => {
    expect(publicPathsFor('pages', [undefined])).not.toContain('/undefined');
  });

  test('slugs are ignored by kinds that do not have their own route', () => {
    expect(publicPathsFor('team', ['home'])).toEqual(['/team']);
  });
});

describe('rowSlug narrows a loosely typed content row', () => {
  test('reads a slug when the table has one', () => {
    expect(rowSlug({ id: 1, slug: 'refunds' })).toBe('refunds');
  });

  test('is undefined for a row without one, and for no row', () => {
    expect(rowSlug({ id: 1, name: 'Jiwan Mijhar' })).toBeUndefined();
    expect(rowSlug(null)).toBeUndefined();
    expect(rowSlug(undefined)).toBeUndefined();
  });

  test('a non-string slug does not become a path', () => {
    expect(rowSlug({ id: 1, slug: 7 })).toBeUndefined();
  });
});

/*
 * `revalidatePath` needs `'page'` for a route pattern and warns instead of
 * purging without it. `revalidateContent` decides by looking for a bracket, so
 * that has to stay the only thing that distinguishes the two.
 */
test('only route patterns contain a bracket', () => {
  for (const kind of KINDS) {
    for (const path of publicPathsFor(kind, ['about'])) {
      expect(path.startsWith('/')).toBe(true);
      expect(path.includes('[')).toBe(path.includes('[slug]'));
    }
  }
});

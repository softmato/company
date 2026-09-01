import type { MetadataRoute } from 'next';

import {
  listPublishedLegalDocuments,
  publishedPageSlugs,
  publishedSlugs,
} from '@/lib/cms/public-queries';
import { isIndexableLegalDocument } from '@/lib/cms/legal-readiness';
import { isProductionSite, siteUrl } from '@/lib/seo/site';

/**
 * Sitemap, built from published content only.
 *
 * Every entry comes from a `status = 'published'` query, so a draft cannot be
 * advertised to a crawler — which would be a slower, more public version of
 * the same leak the public queries exist to prevent. That is why the seven legal
 * documents will not appear here until the founder gives each an effective
 * date and publishes it; the pages 404 until then, and a sitemap full of 404s
 * is how a site loses crawl budget.
 *
 * A non-production deployment returns nothing at all. robots.ts already
 * disallows everything there, but a sitemap is fetched directly by anyone who
 * guesses the URL and by Search Console when someone submits it, neither of
 * which reads robots.txt first.
 *
 * On `priority` and `changeFrequency`: Google has said it ignores both. Bing
 * and smaller crawlers still read them, they cost nothing, and they document
 * the intended shape of the site for the next person. They are not a ranking
 * lever and nothing here should be tuned as if they were.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isProductionSite()) return [];

  const [pages, posts, services, products, legal] = await Promise.all([
    publishedPageSlugs(),
    publishedSlugs('blog'),
    publishedSlugs('services'),
    publishedSlugs('products'),
    listPublishedLegalDocuments(),
  ]);

  /*
   * Pulled out as typed constants rather than written inline: `as const` is
   * not allowed on a ternary, and `MetadataRoute.Sitemap` wants the literal
   * union rather than `string`.
   */
  const weekly = 'weekly' as const;
  const monthly = 'monthly' as const;

  /** `home` is the root path, not `/home`. */
  const pageUrl = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);

  /** How much of the site each CMS page carries, by slug. */
  const pagePriority: Record<string, number> = {
    home: 1,
    services: 0.9,
    products: 0.9,
    about: 0.8,
    contact: 0.8,
    team: 0.6,
    careers: 0.6,
  };

  /**
   * The most recent change anywhere in the blog, used as `/blog`'s own
   * `lastModified`. The index has no CMS row of its own, so without this it
   * would either be missing from the sitemap or claim it was last touched at
   * build time — which is a different and less useful thing to tell a crawler
   * than "the newest post here is from this date".
   */
  const newestPost = posts.reduce<Date | undefined>(
    (latest, row) =>
      !latest || row.updatedAt > latest ? row.updatedAt : latest,
    undefined,
  );

  return [
    ...pages.map((row) => ({
      url: siteUrl(pageUrl(row.slug)),
      lastModified: row.updatedAt,
      changeFrequency: row.slug === 'home' ? weekly : monthly,
      priority: pagePriority[row.slug] ?? 0.5,
    })),

    /*
     * The blog index is a route with no `pages` row behind it, so it has to be
     * listed by hand. Included even when there are no posts yet: it is a real,
     * linked, 200-response page, and leaving it out of the sitemap while the
     * footer links to it is the kind of inconsistency that gets a site
     * partially crawled.
     */
    {
      url: siteUrl('/blog'),
      ...(newestPost ? { lastModified: newestPost } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },

    ...services.map((row) => ({
      url: siteUrl(`/services/${row.slug}`),
      lastModified: row.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...products.map((row) => ({
      url: siteUrl(`/products/${row.slug}`),
      lastModified: row.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...posts.map((row) => ({
      url: siteUrl(`/blog/${row.slug}`),
      lastModified: row.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    /*
     * Only policies that are actually finished. A published document still
     * carrying `[confirm: …]` markers renders, but submitting it to a crawler
     * is asking for the placeholder text to be cached and shown in results —
     * so it is left out here and carries `noindex` on the page itself, both
     * clearing automatically once the text is filled in.
     */
    ...legal
      .filter((row) => isIndexableLegalDocument(row.body))
      .map((row) => ({
        url: siteUrl(`/legal/${row.slug}`),
        lastModified: row.updatedAt,
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      })),
  ];
}

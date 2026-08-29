import 'server-only';
import type { Metadata } from 'next';

import { DEFAULT_OG_IMAGE, SITE_NAME, siteUrl } from '@/lib/seo/site';

/** Re-exported so existing callers keep one import. Defined in lib/seo/site. */
export { siteUrl };

/**
 * Turns a CMS row into Next metadata.
 *
 * One place, so every public page gets the same treatment: the founder's meta
 * title and description win when set, the content's own title is the fallback,
 * and Open Graph never goes out empty.
 *
 * Two things here are not cosmetic:
 *
 * **The canonical URL.** Without it, `softmato.com/services`,
 * `www.softmato.com/services`, the http variant and anything carrying a
 * `?utm_source=` are four pages to a crawler, each holding a quarter of the
 * ranking signal that belongs to one. `path` is how a page declares which URL
 * it really is. A page that omits it gets no canonical rather than a wrong
 * one — a canonical pointing at the wrong URL is worse than none, because it
 * actively de-indexes the right page.
 *
 * **`type: 'article'`.** A blog post that reports itself as a website loses
 * the published and modified times in the preview card, which is most of what
 * makes a shared post look current.
 */
export function metadataFor(
  row: {
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    excerpt?: string | null;
    summary?: string | null;
    tagline?: string | null;
    ogImageUrl?: string | null;
    coverImageUrl?: string | null;
  },
  options: {
    /** Site-relative path this page canonically lives at, e.g. `/about`. */
    path?: string;
    type?: 'website' | 'article';
    publishedTime?: Date | null;
    modifiedTime?: Date | null;
  } = {},
): Metadata {
  const title = row.metaTitle ?? row.title;
  const description =
    row.metaDescription ?? row.excerpt ?? row.summary ?? row.tagline ?? null;
  /*
   * The row's own image when it has one, the generated card otherwise. Never
   * nothing: a page that declares `openGraph` without `images` overrides the
   * layout's default with an empty set and shares as a bare link.
   */
  const image = row.ogImageUrl ?? row.coverImageUrl ?? DEFAULT_OG_IMAGE;

  const { path, type = 'website', publishedTime, modifiedTime } = options;

  return {
    title,
    ...(description ? { description } : {}),
    ...(path ? { alternates: { canonical: siteUrl(path) } } : {}),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      siteName: SITE_NAME,
      type,
      locale: 'en_US',
      ...(path ? { url: siteUrl(path) } : {}),
      images: [image],
      ...(type === 'article'
        ? {
            ...(publishedTime
              ? { publishedTime: publishedTime.toISOString() }
              : {}),
            ...(modifiedTime
              ? { modifiedTime: modifiedTime.toISOString() }
              : {}),
          }
        : {}),
    },
    twitter: {
      /*
       * `summary_large_image` rather than `summary`. The small card crops to a
       * square thumbnail, which turns a 1200×630 social image into an
       * unreadable centre crop.
       */
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: [image],
    },
  };
}

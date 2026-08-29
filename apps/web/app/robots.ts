import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { origin, siteUrl } from '@/lib/seo/site';

/**
 * A preview deployment must not be indexed. Staging copy showing up in search
 * results is a real and hard-to-undo mistake, so anything that is not
 * production is disallowed outright.
 *
 * The admin, checkout and portal surfaces are separate subdomains, but their
 * underlying paths are excluded too — belt and braces, since a rewrite means
 * the same origin can serve both.
 *
 * Note what this file cannot do: `Disallow` stops a crawler fetching a URL, it
 * does not stop the URL being indexed from an inbound link. The `noindex` in
 * the root layout's metadata is what actually keeps a page out of the index,
 * and the two are maintained together on purpose.
 */
export default function robots(): MetadataRoute.Robots {
  if (env.APP_ENV !== 'production') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/checkout',
          '/portal',
          '/api/',
          /*
           * The sign-in page. Nothing links to it from the public site, it has
           * no content worth a result, and an indexed login page is a standing
           * invitation to credential-stuffing traffic.
           */
          '/login',
          /*
           * Tracking parameters. Each one produces a distinct URL for a page
           * that already exists, and the canonical tags are the real fix — but
           * not crawling the duplicates in the first place is cheaper for
           * everyone.
           */
          '/*?*utm_',
          '/*?*fbclid=',
          '/*?*gclid=',
        ],
      },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    /*
     * Non-standard and only Yandex documents honouring it, but it is the one
     * place a site can state which hostname is the real one. Harmless where
     * unsupported.
     */
    host: origin(),
  };
}

import type { MetadataRoute } from 'next';

import { BRAND_MARK_192, BRAND_MARK_512 } from '@/lib/brand/assets';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/seo/site';

/**
 * The web app manifest.
 *
 * This is not an attempt to make the marketing site installable — it is what
 * an Android browser reads to decide what to call the site and which icon to
 * use when someone adds it to their home screen, and what Chrome reads for the
 * address-bar theme colour. Without it, both fall back to a screenshot of the
 * page and the page title, which on a phone is how a company site ends up
 * saved as a grey square labelled "softmato.com".
 *
 * `display: 'browser'` is deliberate. A standalone shell would strip the URL
 * bar from a site that has a login and a checkout on it, and hiding the origin
 * from someone about to type a password is a bad trade for a marketing site.
 *
 * The icons are generated from the S mark by `pnpm brand:build`. The lockup
 * cannot be used here: these are rendered at 48px on a launcher.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'browser',
    /* --background and --primary from globals.css, light theme. */
    background_color: '#fbfdfc',
    theme_color: '#047857',
    lang: 'en',
    icons: [
      {
        src: BRAND_MARK_192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: BRAND_MARK_512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

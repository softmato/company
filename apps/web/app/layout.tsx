import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Outfit } from 'next/font/google';
import './globals.css';

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  DEFAULT_OG_IMAGE,
  isProductionSite,
  origin,
  siteUrl,
} from '@/lib/seo/site';

/**
 * Three faces, three jobs (docs/DESIGN.md §3).
 *
 * Plex Mono is not interchangeable with the others: it carries every figure in
 * the product, and it is here for `tabular-nums`. See `.numeric` in
 * globals.css.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

/*
 * Outfit, not DM Sans. The display face carries the marketing surface's
 * one-line statements at 80px and up, and the reference's headlines are wide,
 * geometric and open — DM Sans is none of those at that size, and tightening
 * it to compensate closed the counters.
 *
 * Three weights, not the whole variable axis: 300 for `.display`, 500 for
 * `.headline`, 400 for the two places a heading sits inside running text. Add
 * a weight here before using one in CSS, or the browser will synthesise it.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-heading',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

/**
 * Site-wide metadata defaults (docs/README.md — the public marketing surface).
 *
 * `metadataBase` is the load-bearing line. Without it, every relative Open
 * Graph image and every canonical URL Next generates stays relative, and a
 * relative `og:image` is ignored by every scraper there is — the link previews
 * come out blank and the cause is invisible in the markup.
 *
 * The title template gives each page its own name plus the company's, so a
 * search result reads "Mobile apps · Softmato" rather than "Mobile apps". The
 * home page opts out with `title.default`, because "Softmato · Softmato" is
 * what a template does to a page whose title is already the company name.
 *
 * `robots` is set here and not only in robots.txt on purpose: robots.txt asks
 * a crawler not to *fetch* a URL, and a URL that is never fetched can still be
 * indexed from an inbound link, with no description because nothing was read.
 * The meta tag is what actually keeps a page out of the index. Both, always.
 */
export const metadata: Metadata = {
  metadataBase: new URL(origin()),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: siteUrl('/'),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  /*
   * Nothing but the production deployment may be indexed. This mirrors
   * app/robots.ts rather than trusting it, for the reason in the note above.
   */
  robots: isProductionSite()
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          /* Let Google use full-length previews and full-size images. */
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      }
    : { index: false, follow: false },
  /*
   * Safari turns anything that looks like a phone number or a date into a
   * link, which mangles the invoice figures and the BS dates the whole
   * product is built around.
   */
  formatDetection: { telephone: false, date: false, address: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${outfit.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

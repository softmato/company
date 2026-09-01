import 'server-only';

import { BRAND_LOGO } from '@/lib/brand/assets';
import { getSettings } from '@/lib/settings/queries';

import { compact } from './json-ld';
import { LEGAL_NAME, SITE_DESCRIPTION, SITE_NAME, siteUrl } from './site';

/**
 * The two entities every page on this site refers back to: the company, and
 * the website itself.
 *
 * They are emitted once, on the home page, and everything else points at them
 * by `@id`. That is deliberate — repeating the Organization block on twenty
 * pages does not make it twenty times more credible, it just gives a crawler
 * twenty chances to find a discrepancy between the copies.
 *
 * **Every contact detail is read from platform settings and omitted when
 * blank.** A registered address invented to fill a required-looking field is
 * both a lie to a search engine and, on a Nepali company's legal pages, a
 * genuine problem. `compact` drops the empty ones.
 */

/** Stable identity for the company across every page and every crawl. */
export const ORGANIZATION_ID = () => siteUrl('/#organization');

/** Stable identity for the site itself. */
export const WEBSITE_ID = () => siteUrl('/#website');

export async function organizationNode() {
  const settings = await getSettings();

  const address = settings.text('company.address');
  const email = settings.text('company.support_email');

  /*
   * Only URLs the founder has actually pasted in. An empty array is dropped
   * entirely rather than emitted as `"sameAs": []`.
   */
  const sameAs = [
    settings.text('company.linkedin_url'),
    settings.text('company.github_url'),
    settings.text('company.x_url'),
    settings.text('company.facebook_url'),
  ].filter((url) => url !== '');

  return compact({
    '@type': 'Organization',
    '@id': ORGANIZATION_ID(),
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: siteUrl('/'),
    description: SITE_DESCRIPTION,
    /*
     * The horizontal lockup, not the social card and not the S mark. This is
     * the image a search engine may show beside the company's name, and it is
     * the one place the full registered identity should be legible.
     */
    logo: compact({
      '@type': 'ImageObject',
      url: siteUrl(BRAND_LOGO),
    }),
    image: siteUrl(BRAND_LOGO),
    /*
     * `company.address` is one free-text field, not a structured one, so it
     * goes in as `streetAddress` whole. Only the country is asserted
     * separately — guessing the city from "built in Kathmandu" would
     * contradict a registered office anywhere else in the valley.
     */
    address: address
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: address,
          addressCountry: 'NP',
        })
      : undefined,
    /*
     * No `telephone`. The number is in settings for invoices, and is kept off
     * every public surface — structured data included, since this block is
     * emitted into the page HTML and read by anything that crawls it. Costs a
     * little local-SEO signal; that is the trade the founder chose.
     */
    email: email || undefined,
    contactPoint: email
      ? [
          compact({
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email,
            areaServed: 'NP',
            availableLanguage: ['en', 'ne'],
          }),
        ]
      : undefined,
    sameAs,
  });
}

/** The site as an entity, published by the organisation above. */
export function websiteNode() {
  return compact({
    '@type': 'WebSite',
    '@id': WEBSITE_ID(),
    url: siteUrl('/'),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
  });
}

/**
 * The home page's `@graph`: both entities in one block.
 *
 * A `@graph` rather than two sibling scripts, so the `@id` references between
 * them resolve within a single document for parsers that do not merge blocks.
 */
export async function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [await organizationNode(), websiteNode()],
  };
}

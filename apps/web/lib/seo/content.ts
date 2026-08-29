import 'server-only';

import { compact } from './json-ld';
import { ORGANIZATION_ID } from './organization';
import { SITE_NAME, origin, siteUrl } from './site';

/**
 * Structured data for the kinds of content page this site has: a post, a
 * service, a product, a policy, an index and a plain page.
 *
 * **Nothing here asserts a rating, a price or a review count.** Those are the
 * fields that earn rich results, which is exactly why they are the ones most
 * often filled with invented numbers — and an `aggregateRating` the company
 * cannot evidence is a manual-action risk, not a growth tactic. When the
 * founder has real, attributable review data, it gets added then.
 *
 * Every builder points `publisher` at the Organization by `@id` rather than
 * repeating it, so the company is described in exactly one place
 * (./organization.ts) and cannot contradict itself across pages.
 */

/** CMS images may be stored absolute (S3) or site-relative. Both must work. */
function absoluteImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin()}${url.startsWith('/') ? url : `/${url}`}`;
}

/** ISO 8601, the only date format schema.org consumers agree on. */
function iso(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

export function blogPostingNode(post: {
  slug: string;
  title: string;
  excerpt?: string | null | undefined;
  metaDescription?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  tags?: string[] | null | undefined;
  publishedAt?: Date | null | undefined;
  updatedAt?: Date | null | undefined;
}) {
  const url = siteUrl(`/blog/${post.slug}`);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    image: absoluteImage(post.coverImageUrl),
    datePublished: iso(post.publishedAt),
    /*
     * `dateModified` is the row's `updatedAt`, which moves when the founder
     * fixes a typo. That is the honest answer to "when did this last change",
     * and it is the field Google reads to decide whether to recrawl.
     */
    dateModified: iso(post.updatedAt) ?? iso(post.publishedAt),
    /*
     * The blog_posts table has no author column, so the company is the author.
     * Naming a person here would be inventing one.
     */
    author: { '@id': ORGANIZATION_ID() },
    publisher: { '@id': ORGANIZATION_ID() },
    keywords: post.tags?.length ? post.tags.join(', ') : undefined,
    inLanguage: 'en',
  });
}

export function serviceNode(service: {
  slug: string;
  title: string;
  summary?: string | null | undefined;
  metaDescription?: string | null | undefined;
}) {
  const url = siteUrl(`/services/${service.slug}`);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.title,
    description: service.metaDescription ?? service.summary ?? undefined,
    url,
    serviceType: service.title,
    provider: { '@id': ORGANIZATION_ID() },
    /*
     * The company is in Nepal and sells software that ships remotely. Both
     * entries are true, and stating only NP would be narrower than reality.
     */
    areaServed: ['NP', 'Worldwide'],
  });
}

export function productNode(product: {
  slug: string;
  title: string;
  tagline?: string | null | undefined;
  metaDescription?: string | null | undefined;
  screenshotUrl?: string | null | undefined;
  logoUrl?: string | null | undefined;
  siteUrl?: string | null | undefined;
}) {
  const url = siteUrl(`/products/${product.slug}`);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}#product`,
    name: product.title,
    description: product.metaDescription ?? product.tagline ?? undefined,
    url,
    image: absoluteImage(product.screenshotUrl ?? product.logoUrl),
    applicationCategory: 'BusinessApplication',
    /*
     * No `offers` and no `aggregateRating`. Both would have to be made up:
     * each product's price lives in the payment platform rather than the CMS,
     * and no review has been collected yet. Add `offers` when there is a
     * published price to point at.
     */
    publisher: { '@id': ORGANIZATION_ID() },
    /* The product's own domain, when it has one, is the same thing as this. */
    sameAs: product.siteUrl ? [product.siteUrl] : undefined,
  });
}

/**
 * A policy page.
 *
 * `datePublished` is the effective date rather than the row's creation date:
 * on a legal document the date that matters is the one it came into force, and
 * it is the one already printed on the page.
 */
export function legalPageNode(doc: {
  slug: string;
  title: string;
  effectiveAt?: Date | null | undefined;
  updatedAt?: Date | null | undefined;
}) {
  const url = siteUrl(`/legal/${doc.slug}`);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: doc.title,
    datePublished: iso(doc.effectiveAt),
    dateModified: iso(doc.updatedAt),
    isPartOf: { '@id': siteUrl('/#website') },
    publisher: { '@id': ORGANIZATION_ID() },
    about: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
  });
}

/**
 * An index page that lists things — /services, /products, /blog.
 *
 * `CollectionPage` carrying an `ItemList` tells a crawler these URLs belong
 * together and in this order, so the list is treated as a set rather than as
 * unrelated pages that happen to be linked from the same place.
 */
export function collectionPageNode(input: {
  path: string;
  name: string;
  description?: string | null | undefined;
  items: { name: string; path: string }[];
}) {
  const url = siteUrl(input.path);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: input.name,
    description: input.description ?? undefined,
    isPartOf: { '@id': siteUrl('/#website') },
    publisher: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
    mainEntity: input.items.length
      ? {
          '@type': 'ItemList',
          itemListElement: input.items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: siteUrl(item.path),
          })),
        }
      : undefined,
  });
}

/**
 * The team page, with each published member as a `Person`.
 *
 * Worth the extra builder because it is the one page whose content is people,
 * and `Person` is how a search engine connects a name on this site to the same
 * name on LinkedIn or GitHub — which is what `sameAs` does here, using the
 * profile URLs the member already has in the CMS.
 *
 * Only published, still-active members reach this: the caller passes the same
 * list the page renders, so the markup cannot describe someone the page does
 * not show.
 */
export function teamPageNode(input: {
  name: string;
  description?: string | null | undefined;
  members: {
    name: string;
    role: string;
    bio?: string | null | undefined;
    photoUrl?: string | null | undefined;
    linkedinUrl?: string | null | undefined;
    githubUrl?: string | null | undefined;
  }[];
}) {
  const url = siteUrl('/team');

  return compact({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#page`,
    url,
    name: input.name,
    description: input.description ?? undefined,
    isPartOf: { '@id': siteUrl('/#website') },
    publisher: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
    mainEntity: input.members.length
      ? {
          '@type': 'ItemList',
          itemListElement: input.members.map((member, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: compact({
              '@type': 'Person',
              name: member.name,
              jobTitle: member.role,
              description: member.bio ?? undefined,
              image: absoluteImage(member.photoUrl),
              worksFor: { '@id': ORGANIZATION_ID() },
              sameAs: [member.linkedinUrl, member.githubUrl].filter(
                (link): link is string => Boolean(link),
              ),
            }),
          })),
        }
      : undefined,
  });
}

/** A plain informational page — /about, /team, /careers. */
export function webPageNode(input: {
  path: string;
  name: string;
  description?: string | null | undefined;
}) {
  const url = siteUrl(input.path);

  return compact({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: input.name,
    description: input.description ?? undefined,
    isPartOf: { '@id': siteUrl('/#website') },
    about: { '@id': ORGANIZATION_ID() },
    publisher: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
  });
}

/**
 * The contact page.
 *
 * `ContactPage` is a distinct type, and it is how a search engine decides
 * which URL to offer as the organisation's contact link — worth its own
 * builder rather than folding into `webPageNode`.
 */
export function contactPageNode(description?: string | null) {
  const url = siteUrl('/contact');

  return compact({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${url}#page`,
    url,
    name: `Contact ${SITE_NAME}`,
    description: description ?? undefined,
    isPartOf: { '@id': siteUrl('/#website') },
    about: { '@id': ORGANIZATION_ID() },
    inLanguage: 'en',
  });
}

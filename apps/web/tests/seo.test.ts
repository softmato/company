/**
 * The SEO layer.
 *
 * Everything here fails silently in production if it is wrong. A canonical
 * pointing at the wrong URL de-indexes the right page; a `<` that survives
 * into a JSON-LD block is an XSS hole authored through the admin panel; an
 * invented `aggregateRating` is a manual action. None of those show up in a
 * browser, which is exactly why they are tested rather than eyeballed.
 */
import { describe, expect, test } from 'vitest';

import {
  isIndexableLegalDocument,
  legalReadiness,
} from '@/lib/cms/legal-readiness';
import { metadataFor } from '@/lib/cms/metadata';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import {
  blogPostingNode,
  collectionPageNode,
  productNode,
  serviceNode,
  teamPageNode,
} from '@/lib/seo/content';
import { compact, serialiseJsonLd } from '@/lib/seo/json-ld';
import { siteUrl } from '@/lib/seo/site';

describe('serialiseJsonLd', () => {
  test('escapes `<` so CMS text cannot terminate the script tag', () => {
    const output = serialiseJsonLd({
      headline: 'Closing tag: </script><img src=x onerror=alert(1)>',
    });

    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<img');
    expect(output).toContain('\\u003c');
  });

  test('escaping survives a round trip, so the value is unchanged', () => {
    const headline = 'a < b </script>';
    const parsed = JSON.parse(serialiseJsonLd({ headline })) as {
      headline: string;
    };

    expect(parsed.headline).toBe(headline);
  });
});

describe('compact', () => {
  test('drops null, undefined, empty strings and empty arrays', () => {
    expect(compact({ a: null, b: undefined, c: '', d: [], e: 'kept' })).toEqual(
      { e: 'kept' },
    );
  });

  test('keeps 0 and false, which are values rather than absences', () => {
    expect(compact({ count: 0, active: false })).toEqual({
      count: 0,
      active: false,
    });
  });
});

describe('breadcrumbList', () => {
  const crumbs = breadcrumbList([
    { name: 'Services', path: '/services' },
    { name: 'Mobile apps' },
  ]);

  test('prepends Home and numbers positions from one', () => {
    expect(crumbs.itemListElement.map((item) => item.name)).toEqual([
      'Home',
      'Services',
      'Mobile apps',
    ]);
    expect(crumbs.itemListElement.map((item) => item.position)).toEqual([
      1, 2, 3,
    ]);
  });

  test('links every crumb except the last', () => {
    const [home, services, current] = crumbs.itemListElement;

    expect(home).toHaveProperty('item', siteUrl('/'));
    expect(services).toHaveProperty('item', siteUrl('/services'));
    /* A self-referential final crumb is what makes Google drop the trail. */
    expect(current).not.toHaveProperty('item');
  });

  test('crumb URLs are absolute', () => {
    for (const item of crumbs.itemListElement) {
      if ('item' in item) expect(item.item).toMatch(/^https?:\/\//);
    }
  });
});

describe('metadataFor', () => {
  const row = { title: 'Mobile apps', summary: 'Apps for phones.' };

  test('sets an absolute canonical when given a path', () => {
    expect(metadataFor(row, { path: '/services/mobile-apps' })).toMatchObject({
      alternates: { canonical: siteUrl('/services/mobile-apps') },
    });
  });

  test('omits the canonical entirely when given no path', () => {
    /* No canonical beats a wrong one — a wrong one de-indexes the real page. */
    expect(metadataFor(row).alternates).toBeUndefined();
  });

  test('prefers the founder-set meta title and description', () => {
    const output = metadataFor({
      ...row,
      metaTitle: 'Mobile app development in Nepal',
      metaDescription: 'What we build and how.',
    });

    expect(output.title).toBe('Mobile app development in Nepal');
    expect(output.description).toBe('What we build and how.');
  });

  test('falls back through excerpt, summary and tagline', () => {
    expect(metadataFor({ title: 'T', tagline: 'Tag' }).description).toBe('Tag');
    expect(metadataFor({ title: 'T', excerpt: 'Ex' }).description).toBe('Ex');
  });

  test('an article carries its published and modified times', () => {
    const published = new Date('2026-01-02T03:04:05.000Z');
    const modified = new Date('2026-02-03T04:05:06.000Z');

    expect(
      metadataFor(row, {
        path: '/blog/x',
        type: 'article',
        publishedTime: published,
        modifiedTime: modified,
      }).openGraph,
    ).toMatchObject({
      type: 'article',
      publishedTime: published.toISOString(),
      modifiedTime: modified.toISOString(),
    });
  });

  test('a website carries no article times, even if they are passed', () => {
    const openGraph = metadataFor(row, {
      path: '/services',
      publishedTime: new Date(),
    }).openGraph;

    expect(openGraph).not.toHaveProperty('publishedTime');
  });

  test('falls back to the generated card when the row has no image', () => {
    /*
     * Not "leaves images unset". Declaring `openGraph` without `images`
     * overrides the layout default with an empty set, and Next's
     * file-convention merge does not fill it back in — which is how every
     * page on the site ended up with no `og:image` at all.
     */
    expect(metadataFor(row).openGraph).toMatchObject({
      images: ['/opengraph-image'],
    });
    expect(metadataFor(row).twitter).toMatchObject({
      images: ['/opengraph-image'],
    });
  });

  test("prefers the row's own image over the generated card", () => {
    const output = metadataFor({ ...row, coverImageUrl: 'https://cdn/x.png' });

    expect(output.openGraph).toMatchObject({ images: ['https://cdn/x.png'] });
  });

  test('uses the large Twitter card, which does not centre-crop', () => {
    expect(metadataFor(row).twitter).toMatchObject({
      card: 'summary_large_image',
    });
  });
});

describe('content nodes', () => {
  test('a product asserts no price and no rating', () => {
    const node = productNode({
      slug: 'hostelhub',
      title: 'HostelHub',
      tagline: 'Hostel management.',
    });

    /*
     * Both are strong rich-result triggers and both would have to be invented:
     * prices live in the payment platform, and no review has been collected.
     * This test exists to fail loudly if someone adds them from memory.
     */
    expect(node).not.toHaveProperty('offers');
    expect(node).not.toHaveProperty('aggregateRating');
    expect(node).not.toHaveProperty('review');
  });

  test('a post with no modification date falls back to its publication date', () => {
    const publishedAt = new Date('2026-03-04T00:00:00.000Z');
    const node = blogPostingNode({
      slug: 'why',
      title: 'Why',
      publishedAt,
    });

    expect(node.dateModified).toBe(publishedAt.toISOString());
  });

  test('a post names no author the database does not have', () => {
    const node = blogPostingNode({ slug: 'why', title: 'Why' });

    /* blog_posts has no author column; the company is the author. */
    expect(node.author).toEqual({ '@id': siteUrl('/#organization') });
  });

  test('a service points at the organisation rather than describing it', () => {
    const node = serviceNode({ slug: 'mobile-apps', title: 'Mobile apps' });

    expect(node.provider).toEqual({ '@id': siteUrl('/#organization') });
    expect(node.url).toBe(siteUrl('/services/mobile-apps'));
  });

  test('an empty collection omits mainEntity rather than listing nothing', () => {
    const node = collectionPageNode({
      path: '/products',
      name: 'Products',
      items: [],
    });

    expect(node).not.toHaveProperty('mainEntity');
  });

  test('a team member links only to profiles that are actually set', () => {
    const node = teamPageNode({
      name: 'Team',
      members: [
        {
          name: 'A Person',
          role: 'Engineer',
          linkedinUrl: 'https://linkedin.com/in/example',
          githubUrl: null,
        },
      ],
    });

    const [first] = (
      node.mainEntity as {
        itemListElement: { item: { sameAs?: string[] } }[];
      }
    ).itemListElement;

    expect(first?.item.sameAs).toEqual(['https://linkedin.com/in/example']);
  });
});

describe('legal readiness', () => {
  const finished = 'These terms govern your use of the service.';
  const withMarker = 'Registered at [confirm: registered office address].';
  const withBanner = '> **Draft — not yet reviewed.** Starting point only.';

  test('a finished policy is indexable', () => {
    expect(isIndexableLegalDocument(finished)).toBe(true);
  });

  test('an unfilled [confirm: …] marker blocks indexing', () => {
    expect(isIndexableLegalDocument(withMarker)).toBe(false);
    expect(legalReadiness(withMarker).unconfirmed).toBe(1);
  });

  test('the draft banner blocks indexing on its own', () => {
    expect(isIndexableLegalDocument(withBanner)).toBe(false);
    expect(legalReadiness(withBanner).draftBanner).toBe(true);
  });

  test('counts every marker, so progress is visible', () => {
    const body = '[confirm: a] and [confirm: b] and [confirm: c]';
    expect(legalReadiness(body).unconfirmed).toBe(3);
  });

  test('the guard clears itself once the text is filled in', () => {
    /*
     * The point of the whole mechanism: nobody has to remember to turn
     * indexing back on. Editing the placeholders out is the switch.
     */
    const before = `${withBanner}\n\n${withMarker}`;
    const after = finished;

    expect(isIndexableLegalDocument(before)).toBe(false);
    expect(isIndexableLegalDocument(after)).toBe(true);
  });
});

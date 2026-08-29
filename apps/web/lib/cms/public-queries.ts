import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  blogPosts,
  db,
  legalDocuments,
  pages,
  productPages,
  services,
  teamMembers,
} from '@softmato/db';

/**
 * Public reads. **Every query here filters on `status = 'published'`.**
 *
 * This is the whole reason the file exists separately from ./queries, which is
 * admin-side and deliberately returns drafts. A public page must never import
 * from that module — an unpublished refund policy or a half-written post going
 * live is the failure this separation prevents.
 *
 * The rule is enforced by tests in apps/web/tests/cms-public.test.ts, which
 * seed a draft alongside a published row and assert only one comes back.
 */

/** The one condition every function below shares. */
const published = <T extends { status: unknown }>(table: T) =>
  eq(table.status as never, 'published');

/**
 * A published page by slug.
 *
 * Wrapped in React's per-request `cache`, because a single render asks for the
 * same row up to three times: `generateMetadata` for the title and canonical,
 * the page body for its content, and the structured data for its description.
 * Deduped they are one query; undeduped they were three, and the third only
 * appeared when the SEO work landed. This is a request-scoped memo, not a time
 * cache — an edit in the admin panel is visible on the very next request.
 */
export const getPage = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), published(pages)))
    .limit(1);

  return row ?? null;
});

export async function listPublishedServices() {
  return db
    .select()
    .from(services)
    .where(published(services))
    .orderBy(asc(services.sortOrder), asc(services.title));
}

export const getService = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(services)
    .where(and(eq(services.slug, slug), published(services)))
    .limit(1);

  return row ?? null;
});

/** Only members who are both published and still with the company. */
export async function listPublishedTeam() {
  return db
    .select()
    .from(teamMembers)
    .where(and(published(teamMembers), eq(teamMembers.isActive, true)))
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.name));
}

export async function listPublishedProducts() {
  return db
    .select()
    .from(productPages)
    .where(published(productPages))
    .orderBy(asc(productPages.sortOrder), asc(productPages.title));
}

export const getProductPage = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(productPages)
    .where(and(eq(productPages.slug, slug), published(productPages)))
    .limit(1);

  return row ?? null;
});

export async function listPublishedPosts() {
  return db
    .select()
    .from(blogPosts)
    .where(published(blogPosts))
    .orderBy(desc(blogPosts.publishedAt));
}

export const getPost = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), published(blogPosts)))
    .limit(1);

  return row ?? null;
});

/**
 * The current version of a legal document.
 *
 * Highest published version wins. Superseded versions stay in the table and
 * stay readable by version, so what a customer agreed to on a given date can
 * still be produced — that is the point of versioning them.
 */
export const getLegalDocument = cache(async (slug: string) => {
  const [row] = await db
    .select()
    .from(legalDocuments)
    .where(and(eq(legalDocuments.slug, slug), published(legalDocuments)))
    .orderBy(desc(legalDocuments.version))
    .limit(1);

  return row ?? null;
});

export async function listPublishedLegalDocuments() {
  /*
   * One row per slug: the highest published version. DISTINCT ON is Postgres
   * specific and needs its ORDER BY to lead with the same expression.
   */
  const rows = await db
    .select()
    .from(legalDocuments)
    .where(published(legalDocuments))
    .orderBy(asc(legalDocuments.slug), desc(legalDocuments.version));

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.slug)) return false;
    seen.add(row.slug);
    return true;
  });
}

/** Slugs for `generateStaticParams` and the sitemap. Published only. */
export async function publishedSlugs(
  kind: 'blog' | 'services' | 'products' | 'legal',
): Promise<{ slug: string; updatedAt: Date }[]> {
  switch (kind) {
    case 'blog':
      return db
        .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
        .from(blogPosts)
        .where(published(blogPosts));
    case 'services':
      return db
        .select({ slug: services.slug, updatedAt: services.updatedAt })
        .from(services)
        .where(published(services));
    case 'products':
      return db
        .select({ slug: productPages.slug, updatedAt: productPages.updatedAt })
        .from(productPages)
        .where(published(productPages));
    case 'legal':
      return db
        .selectDistinctOn([legalDocuments.slug], {
          slug: legalDocuments.slug,
          updatedAt: legalDocuments.updatedAt,
        })
        .from(legalDocuments)
        .where(published(legalDocuments))
        .orderBy(asc(legalDocuments.slug), desc(legalDocuments.version));
  }
}

/** Published page slugs, for the sitemap. */
export async function publishedPageSlugs() {
  return db
    .select({ slug: pages.slug, updatedAt: pages.updatedAt })
    .from(pages)
    .where(published(pages));
}

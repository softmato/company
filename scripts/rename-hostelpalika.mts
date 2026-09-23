/**
 * One-off: the product HostelHub is now HostelPalika (hostelpalika.com).
 *
 *     pnpm rename:hostelpalika
 *
 * The seeds only insert, so the live rows keep the old name until this runs.
 * It rewrites the product page from its seed (new slug, site link, logo,
 * screenshots) and renames every other public mention. `/products/hostelhub`
 * is redirected in next.config. The id `hostelhub` stays: it is the ledger key
 * and is baked into issued client_ids. Safe to run twice. Run it before
 * deploying, so the build picks up the new slug.
 */
import {
  blogPosts,
  closeDb,
  db,
  pages,
  productPages,
  products,
  services,
} from '@softmato/db';
import { eq, sql, type AnyColumn } from 'drizzle-orm';

import { productPageSeeds } from '../packages/db/seed/marketing/products.ts';


const rename = (column: AnyColumn) =>
  sql`replace(${column}, 'HostelHub', 'HostelPalika')`;

await db.transaction(async (tx) => {
  await tx
    .update(products)
    .set({ name: 'HostelPalika' })
    .where(eq(products.id, 'hostelhub'));

  // Both product pages: HostelPalika's rename, and QuestionCall's site link
  // and logo. Their live copy was still the seed copy, so the seed wins.
  for (const seed of productPageSeeds) {
    await tx
      .update(productPages)
      .set({
        slug: seed.slug,
        title: seed.title,
        tagline: seed.tagline,
        metaDescription: seed.metaDescription,
        body: seed.body,
        siteUrl: seed.siteUrl,
        logoUrl: seed.logoUrl,
        screenshotUrl: seed.screenshotUrl ?? null,
      })
      .where(eq(productPages.productId, seed.productId));
  }

  for (const table of [pages, services, blogPosts]) {
    await tx.update(table).set({
      title: rename(table.title),
      metaDescription: rename(table.metaDescription),
      body: rename(table.body),
    });
  }
  await tx.update(blogPosts).set({ excerpt: rename(blogPosts.excerpt) });
});

console.log(
  'Product pages now:',
  await db
    .select({ slug: productPages.slug, siteUrl: productPages.siteUrl })
    .from(productPages),
);

await closeDb();

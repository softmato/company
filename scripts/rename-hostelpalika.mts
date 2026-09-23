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

const seed = productPageSeeds.find((p) => p.productId === 'hostelhub');
if (!seed) throw new Error('No hostelhub product page seed');

const rename = (column: AnyColumn) =>
  sql`replace(${column}, 'HostelHub', 'HostelPalika')`;

await db.transaction(async (tx) => {
  await tx
    .update(products)
    .set({ name: 'HostelPalika' })
    .where(eq(products.id, 'hostelhub'));

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
      screenshotUrl: seed.screenshotUrl,
    })
    .where(eq(productPages.productId, 'hostelhub'));

  for (const table of [pages, services, blogPosts]) {
    await tx.update(table).set({
      title: rename(table.title),
      metaDescription: rename(table.metaDescription),
      body: rename(table.body),
    });
  }
  await tx.update(blogPosts).set({ excerpt: rename(blogPosts.excerpt) });
});

const [page] = await db
  .select({ slug: productPages.slug, title: productPages.title })
  .from(productPages)
  .where(eq(productPages.productId, 'hostelhub'));
console.log('Product page now:', page);

await closeDb();

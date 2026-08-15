/**
 * Seed runner. Idempotent: safe to run repeatedly against a fresh or
 * partially-seeded database.
 *
 * Reference data only — accounts, products, providers, fiscal periods, and
 * placeholder CMS content. It never posts a journal entry, and it never
 * publishes a page.
 */
import { and, eq, like, sql } from 'drizzle-orm';

import { db } from '../client';
import { accounts, products } from '../schema/accounts';
import {
  blogPosts,
  legalDocuments,
  pages,
  productPages,
  services,
  teamMembers,
} from '../schema/cms';
import { fiscalPeriods } from '../schema/fiscal';
import { paymentProviders } from '../schema/providers';

import { accountSeeds } from './accounts';
import {
  blogPostSeeds,
  legalDocumentSeeds,
  pageSeeds,
  productPageSeeds,
  serviceSeeds,
  teamMemberSeeds,
} from './cms';
import { productSeeds } from './products';
import { providerSeeds } from './providers';
import { buildFiscalPeriods } from './fiscal-periods';

// 2083/84 runs 17 Jul 2026 – 16 Jul 2027; it is the year in progress.
const FISCAL_YEAR = process.env.SEED_FISCAL_YEAR ?? '2083/84';

async function main(): Promise<void> {
  // Headers before leaves: parent_code is a foreign key onto accounts itself.
  const headers = accountSeeds.filter((a) => a.isPostable === false);
  const leaves = accountSeeds.filter((a) => a.isPostable !== false);

  for (const batch of [headers, leaves]) {
    for (const account of batch) {
      await db.insert(accounts).values(account).onConflictDoNothing();
    }
  }
  console.log(`accounts: ${accountSeeds.length} ensured`);

  await db.insert(products).values(productSeeds).onConflictDoNothing();
  console.log(`products: ${productSeeds.length} ensured`);

  await db.insert(paymentProviders).values(providerSeeds).onConflictDoNothing();
  console.log(`payment providers: ${providerSeeds.length} ensured`);

  // Throws with an explanation while the BS calendar is unconfirmed — that is
  // deliberate. Seeding invented period boundaries would misfile revenue.
  const periods = buildFiscalPeriods(FISCAL_YEAR);
  await db.insert(fiscalPeriods).values(periods).onConflictDoNothing();
  console.log(`fiscal periods: ${periods.length} ensured for ${FISCAL_YEAR}`);

  await seedCms();
}

/**
 * Placeholder content, all of it draft. See ./cms.ts — nothing here is
 * publishable copy, and the seeder never publishes anything.
 */
async function seedCms(): Promise<void> {
  await db.insert(pages).values(pageSeeds).onConflictDoNothing();
  await db.insert(services).values(serviceSeeds).onConflictDoNothing();
  await db.insert(productPages).values(productPageSeeds).onConflictDoNothing();
  await db
    .insert(legalDocuments)
    .values(legalDocumentSeeds)
    .onConflictDoNothing();

  await db.insert(blogPosts).values(blogPostSeeds).onConflictDoNothing();

  /*
   * A database seeded before the real copy existed still holds the old
   * placeholder text, and `onConflictDoNothing` above leaves it there.
   *
   * Upgrade it in place — but only where the body is *still* the placeholder
   * and the row is *still* a draft. A page the founder has edited, or one
   * already published, is never touched by a seed run. That pair of conditions
   * is the whole safety argument; do not relax either one.
   */
  const upgraded =
    (await upgradePlaceholders(pages, pageSeeds)) +
    (await upgradePlaceholders(services, serviceSeeds)) +
    (await upgradePlaceholders(productPages, productPageSeeds)) +
    (await upgradeLegalPlaceholders());

  if (upgraded > 0) {
    console.log(`cms: ${upgraded} placeholder rows replaced with draft copy`);
  }

  /*
   * team_members has no natural key to conflict on — a person is not
   * identified by their name. Insert only into an empty table, so a re-run
   * cannot duplicate the placeholders or resurrect ones the founder deleted.
   */
  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teamMembers);

  if ((existing?.count ?? 0) === 0) {
    await db.insert(teamMembers).values(teamMemberSeeds);
  }

  console.log(
    `cms: ${pageSeeds.length} pages, ${serviceSeeds.length} services, ` +
      `${productPageSeeds.length} product pages, ${legalDocumentSeeds.length} legal ` +
      `documents, ${blogPostSeeds.length} post — all draft`,
  );
}

/** The marker every placeholder body carried. */
const PLACEHOLDER_MARKER = '%**Placeholder.**%';

/**
 * Tables keyed by slug, holding a title and a body. Written generically
 * because the alternative is the same six lines four times, and a rule about
 * not overwriting a founder's work should exist in exactly one place.
 */
type CopyTable = typeof pages | typeof services | typeof productPages;
type CopySeed = { slug: string; title: string; body?: string | undefined };

async function upgradePlaceholders(
  table: CopyTable,
  seeds: CopySeed[],
): Promise<number> {
  let count = 0;

  for (const seed of seeds) {
    if (!seed.body) continue;

    const rows = await db
      .update(table)
      .set({ title: seed.title, body: seed.body, updatedAt: new Date() })
      .where(
        and(
          eq(table.slug, seed.slug),
          eq(table.status, 'draft'),
          like(table.body, PLACEHOLDER_MARKER),
        ),
      )
      .returning({ slug: table.slug });

    count += rows.length;
  }

  return count;
}

/** Same rule, but legal documents are keyed by slug *and* version. */
async function upgradeLegalPlaceholders(): Promise<number> {
  let count = 0;

  for (const seed of legalDocumentSeeds) {
    if (!seed.body) continue;

    const rows = await db
      .update(legalDocuments)
      .set({ title: seed.title, body: seed.body, updatedAt: new Date() })
      .where(
        and(
          eq(legalDocuments.slug, seed.slug),
          eq(legalDocuments.version, seed.version ?? 1),
          eq(legalDocuments.status, 'draft'),
          like(legalDocuments.body, PLACEHOLDER_MARKER),
        ),
      )
      .returning({ slug: legalDocuments.slug });

    count += rows.length;
  }

  return count;
}

await main();
console.log('seed complete');
process.exit(0);

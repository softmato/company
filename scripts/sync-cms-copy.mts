/**
 * Pulls a local database's CMS rows back in line with the seeds.
 *
 *   pnpm cms:sync-copy
 *
 * **Local only, and it overwrites.** Why it exists: the seeder is idempotent
 * and deliberately refuses to touch a row that is already published, because
 * outside development that row is a founder's own words on the public
 * internet. A development database seeded before the real copy was written
 * therefore keeps its placeholders for ever — "Placeholder tagline.", a null
 * `metaTitle`, two fictional team members — and no amount of re-seeding fixes
 * it.
 *
 * This is the escape hatch for that one case. It refuses to run anywhere but
 * local, and it says exactly what it changed.
 *
 * Team members are the careful part. They have no natural key — a person is
 * not identified by their name — so this replaces them only when every row in
 * the table is one of the known fictional placeholders. The moment a real
 * person has been added through the panel, it leaves the table alone and says
 * so. Deleting a colleague because a script could not tell them apart from a
 * placeholder is not a trade worth making.
 */
import { eq, sql } from 'drizzle-orm';
import {
  closeDb,
  db,
  pages,
  productPages,
  services,
  teamMembers,
} from '@softmato/db';
import {
  pageSeeds,
  productPageSeeds,
  serviceSeeds,
  teamMemberSeeds,
} from '@softmato/db/seed/cms';

if (process.env.APP_ENV !== 'local') {
  console.error(
    `Refusing to run with APP_ENV=${process.env.APP_ENV ?? 'unset'}. ` +
      'This overwrites published copy; outside local that is a decision for a ' +
      'person and the admin panel.',
  );
  process.exit(1);
}

/** The fictional rows that used to be seeded. Nothing else is ever removed. */
const PLACEHOLDER_NAMES = new Set(['Placeholder Person', 'Second Placeholder']);

const now = new Date();

async function syncPages(): Promise<number> {
  let count = 0;

  for (const seed of pageSeeds) {
    const rows = await db
      .update(pages)
      .set({
        title: seed.title,
        metaTitle: seed.metaTitle ?? null,
        metaDescription: seed.metaDescription ?? null,
        ...(seed.body ? { body: seed.body } : {}),
        updatedAt: now,
      })
      .where(eq(pages.slug, seed.slug))
      .returning({ slug: pages.slug });

    count += rows.length;
  }

  return count;
}

async function syncServices(): Promise<number> {
  let count = 0;

  for (const seed of serviceSeeds) {
    const rows = await db
      .update(services)
      .set({
        title: seed.title,
        summary: seed.summary ?? null,
        ...(seed.body ? { body: seed.body } : {}),
        updatedAt: now,
      })
      .where(eq(services.slug, seed.slug))
      .returning({ slug: services.slug });

    count += rows.length;
  }

  return count;
}

async function syncProducts(): Promise<number> {
  let count = 0;

  for (const seed of productPageSeeds) {
    const rows = await db
      .update(productPages)
      .set({
        title: seed.title,
        tagline: seed.tagline ?? null,
        ...(seed.body ? { body: seed.body } : {}),
        updatedAt: now,
      })
      .where(eq(productPages.slug, seed.slug))
      .returning({ slug: productPages.slug });

    count += rows.length;
  }

  return count;
}

/**
 * Replaces the fictional team, or refuses.
 *
 * Returns the number of members inserted, or -1 for "left alone" — which the
 * caller reports rather than swallows, because a silent no-op here looks
 * identical to success and the founder would go on wondering why the team page
 * still lists nobody real.
 */
async function syncTeam(): Promise<number> {
  const existing = await db
    .select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers);

  const allPlaceholders = existing.every((row) =>
    PLACEHOLDER_NAMES.has(row.name),
  );

  if (existing.length > 0 && !allPlaceholders) return -1;

  await db.delete(teamMembers);

  /*
   * Published, unlike a seed run. This script exists to make a development
   * site show real content, and a team member seeded as a draft does not
   * appear on /team — which is the thing we are here to fix.
   */
  await db
    .insert(teamMembers)
    .values(teamMemberSeeds.map((member) => ({ ...member, status: 'published' as const })));

  return teamMemberSeeds.length;
}

const [pageCount, serviceCount, productCount, teamCount] = [
  await syncPages(),
  await syncServices(),
  await syncProducts(),
  await syncTeam(),
];

console.log(`pages:    ${pageCount} refreshed`);
console.log(`services: ${serviceCount} refreshed`);
console.log(`products: ${productCount} refreshed`);

if (teamCount < 0) {
  console.log(
    'team:     left alone — the table holds someone who is not a known ' +
      'placeholder. Edit the team in the admin panel instead.',
  );
} else {
  console.log(`team:     ${teamCount} members replaced and published`);
}

const [remaining] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(teamMembers);

console.log(`team table now holds ${remaining?.count ?? 0} rows`);

await closeDb();
process.exit(0);

/**
 * Publishes every piece of CMS content, for local development.
 *
 * The seeder deliberately never publishes: putting words on the internet is a
 * decision a person makes. This script is the escape hatch for the case where
 * you just want to look at the site — so it refuses to run anywhere but local.
 *
 *   pnpm cms:publish-all          publish everything
 *   pnpm cms:publish-all -- --draft   put it all back to draft
 *
 * Legal documents get an effective date because the database refuses to
 * publish one without it, and a policy nobody can date is not evidence of what
 * a customer agreed to.
 */
import { eq, isNull, sql } from 'drizzle-orm';
import {
  blogPosts,
  closeDb,
  db,
  legalDocuments,
  pages,
  productPages,
  services,
  teamMembers,
} from '@softmato/db';

if (process.env.APP_ENV !== 'local') {
  console.error(
    `Refusing to run with APP_ENV=${process.env.APP_ENV ?? 'unset'}. ` +
      'This publishes unreviewed copy and unreviewed legal text; outside ' +
      'local that is a decision for a person and the admin panel.',
  );
  process.exit(1);
}

const draft = process.argv.includes('--draft');
const now = new Date();

async function set(
  table:
    | typeof pages
    | typeof services
    | typeof productPages
    | typeof blogPosts,
  label: string,
): Promise<void> {
  const rows = await db
    .update(table)
    .set(
      draft
        ? { status: 'draft', publishedAt: null, updatedAt: now }
        : { status: 'published', publishedAt: now, updatedAt: now },
    )
    .returning({ id: table.id });

  console.log(`${label.padEnd(14)} ${rows.length} → ${draft ? 'draft' : 'published'}`);
}

await set(pages, 'pages');
await set(services, 'services');
await set(productPages, 'product pages');
await set(blogPosts, 'blog posts');

// Blog posts carry their own published date; a published one must have it.
if (!draft) {
  await db
    .update(blogPosts)
    .set({ publishedAt: now })
    .where(isNull(blogPosts.publishedAt));
}

const team = await db
  .update(teamMembers)
  .set({ status: draft ? 'draft' : 'published', updatedAt: now })
  .returning({ id: teamMembers.id });
console.log(`team          ${team.length} → ${draft ? 'draft' : 'published'}`);

const legal = await db
  .update(legalDocuments)
  .set(
    draft
      ? { status: 'draft', publishedAt: null, effectiveAt: null, updatedAt: now }
      : {
          status: 'published',
          publishedAt: now,
          effectiveAt: sql`coalesce(${legalDocuments.effectiveAt}, ${now})`,
          updatedAt: now,
        },
  )
  .returning({ slug: legalDocuments.slug });
console.log(`legal         ${legal.length} → ${draft ? 'draft' : 'published'}`);

if (!draft) {
  console.log(
    '\nEvery policy still carries its "Draft — not yet reviewed" notice and ' +
      'its [confirm: …] markers. Read them before this database is anything ' +
      'but local.',
  );
}

await closeDb();
process.exit(0);

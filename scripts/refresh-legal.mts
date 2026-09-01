/**
 * Rewrites the stored legal documents from the seed files, and optionally
 * publishes them.
 *
 *     pnpm legal:refresh                  update the bodies, change no statuses
 *     pnpm legal:refresh --publish        …and publish every document that is ready
 *     pnpm legal:refresh --publish --effective=2026-09-01
 *
 * **Why this exists separately from `pnpm seed`.** The seeder replaces a legal
 * body only where it is *still* the old placeholder text and *still* draft, so
 * a founder's edits and anything already published are safe from a seed run.
 * That rule is correct and stays. But it also means a database seeded before a
 * rewrite keeps serving the old text forever — which is exactly what happened
 * between sessions 11 and 12: the seeds moved to `{{company.*}}` tokens while
 * six published rows kept their `[confirm: …]` markers and their August bodies.
 *
 * So this is the deliberate override, kept out of the seeder and given a name
 * that says what it does. It overwrites the current version in place rather
 * than superseding it with a new one, which is only defensible while the site
 * has never been deployed: nobody has read these pages, so there is no version
 * history worth preserving. **Once the site is live, stop using this** — a
 * changed policy then needs a new version row and a new effective date, so that
 * what a customer agreed to on a given date stays knowable.
 *
 * Publishing runs the same readiness rule as `pnpm legal:check` and the sitemap
 * (apps/web/lib/cms/legal-readiness.ts), against the **resolved** text. A
 * document with an unfilled setting is skipped, not published.
 */
import { and, eq } from 'drizzle-orm';
import { closeDb, db, legalDocuments, platformSettings } from '@softmato/db';

import { legalDocumentSeeds } from '../packages/db/seed/legal';
import { legalReadiness } from '../apps/web/lib/cms/legal-readiness';
import { resolveTokens } from '../apps/web/lib/cms/tokens';
import { resolve } from '../apps/web/lib/settings/registry';

const publish = process.argv.includes('--publish');

/** `--effective=YYYY-MM-DD`, defaulting to today. */
const effectiveArg = process.argv
  .find((a) => a.startsWith('--effective='))
  ?.slice('--effective='.length);

const effectiveAt = effectiveArg ? new Date(`${effectiveArg}T00:00:00Z`) : new Date();

if (Number.isNaN(effectiveAt.getTime())) {
  console.error(`Not a date: ${effectiveArg}. Use --effective=YYYY-MM-DD.`);
  process.exit(1);
}

const now = new Date();

const stored = await db
  .select({ key: platformSettings.key, value: platformSettings.value })
  .from(platformSettings);

const settings = resolve(new Map(stored.map((row) => [row.key, row.value])));

let written = 0;
let published = 0;
let skipped = 0;

for (const seed of legalDocumentSeeds) {
  if (!seed.body) continue;

  const version = seed.version ?? 1;

  const [existing] = await db
    .select({ id: legalDocuments.id, status: legalDocuments.status })
    .from(legalDocuments)
    .where(
      and(
        eq(legalDocuments.slug, seed.slug),
        eq(legalDocuments.version, version),
      ),
    );

  /*
   * Readiness is judged on the text a reader would actually see, not on the
   * stored body: a document whose every marker has become a token looks clean
   * in the file and can still render `[confirm: Registered address]`.
   */
  const { ready, unconfirmed, draftBanner } = legalReadiness(
    resolveTokens(seed.body, settings),
  );

  const goLive = publish && ready;

  const values = {
    title: seed.title,
    body: seed.body,
    updatedAt: now,
    ...(goLive
      ? { status: 'published' as const, publishedAt: now, effectiveAt }
      : {}),
  };

  if (existing) {
    await db.update(legalDocuments).set(values).where(eq(legalDocuments.id, existing.id));
  } else {
    await db.insert(legalDocuments).values({ ...seed, ...values, version });
  }

  written += 1;
  if (goLive) published += 1;

  const note = ready
    ? goLive
      ? 'published'
      : 'ready'
    : `blocked — ${[
        unconfirmed > 0 ? `${unconfirmed} unfilled` : '',
        draftBanner ? 'draft banner' : '',
      ]
        .filter(Boolean)
        .join(', ')}`;

  if (publish && !ready) skipped += 1;

  console.log(
    [
      existing ? '  ~' : '  +',
      seed.slug.padEnd(12),
      `v${version}`,
      `${String(seed.body.length).padStart(6)} ch`,
      note,
    ].join('  '),
  );
}

console.log(
  `\n${written} documents rewritten from the seeds` +
    (publish ? `, ${published} published, ${skipped} skipped as not ready` : '') +
    '.',
);

if (publish && published > 0) {
  console.log(`Effective ${effectiveAt.toISOString().slice(0, 10)}.`);
}

await closeDb();
process.exit(0);

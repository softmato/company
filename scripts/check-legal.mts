/**
 * Reports whether the legal documents are actually fit to publish.
 *
 * `cms:publish-all` exists for local development and will happily publish a
 * policy that still carries its "not yet reviewed" banner and its unfilled
 * `[confirm: …]` markers. That is fine on localhost and is a live legal
 * document that lies about itself in production, so this is the check that
 * runs before a deploy.
 */
import { closeDb, db, legalDocuments } from '@softmato/db';

const rows = await db.select().from(legalDocuments);

let blocking = 0;

for (const r of rows) {
  const confirms = (r.body.match(/\[confirm:/g) ?? []).length;
  const banner = r.body.includes('Draft — not yet reviewed');
  const bad = r.status === 'published' && (confirms > 0 || banner);

  if (bad) blocking += 1;

  console.log(
    [
      bad ? 'BLOCK' : '  ok ',
      r.slug.padEnd(9),
      `v${r.version}`,
      r.status.padEnd(9),
      r.effectiveAt ? String(r.effectiveAt).slice(0, 10) : 'no-date   ',
      `confirm:${String(confirms).padEnd(2)}`,
      banner ? 'draft-banner' : '',
    ].join('  '),
  );
}

console.log(`\n${rows.length} documents, ${blocking} blocking publication.`);

await closeDb();
process.exit(blocking > 0 ? 1 : 0);

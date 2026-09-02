/**
 * Reports whether the legal documents are actually fit to publish.
 *
 * `cms:publish-all` exists for local development and will happily publish a
 * policy that still carries its "not yet reviewed" banner and its unfilled
 * `[confirm: …]` markers. That is fine on localhost and is a live legal
 * document that lies about itself in production, so this is the check that
 * runs before a deploy.
 *
 * Company details are `{{settings.key}}` tokens resolved at render time, so the
 * check runs against the **resolved** text rather than the stored body. A
 * document whose every marker has been replaced by a token would otherwise
 * look clean here while rendering `[confirm: Registered address]` to a reader,
 * which is the exact failure this script exists to catch.
 */
import { closeDb, db, legalDocuments, platformSettings } from '@softmato/db';

import { legalReadiness } from '../apps/web/lib/cms/legal-readiness';
import { resolveTokens } from '../apps/web/lib/cms/tokens';
import { resolve } from '../apps/web/lib/settings/registry';

const stored = await db
  .select({ key: platformSettings.key, value: platformSettings.value })
  .from(platformSettings);

const settings = resolve(new Map(stored.map((row) => [row.key, row.value])));

const rows = await db.select().from(legalDocuments);

let blocking = 0;

for (const r of rows) {
  /*
   * The same rule the public pages use to decide whether a crawler may index
   * a policy — see apps/web/lib/cms/legal-readiness.ts. Shared rather than
   * repeated, so this check and the site cannot drift apart.
   */
  const {
    ready,
    unconfirmed: confirms,
    draftBanner: banner,
  } = legalReadiness(resolveTokens(r.body, settings));

  const bad = r.status === 'published' && !ready;

  if (bad) blocking += 1;

  console.log(
    [
      bad ? 'BLOCK' : '  ok ',
      r.slug.padEnd(11),
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

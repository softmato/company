/**
 * Lists everything the legal documents still need before they can be published.
 *
 * Two different jobs, so two lists:
 *
 *   **Settings** are `{{settings.key}}` tokens with nothing saved behind them.
 *   The founder fixes these in the admin panel; no code or content changes.
 *
 *   **Markers** are literal `[confirm: …]` left in the document text. Those
 *   need someone to edit the document, because no setting stands behind them.
 *
 * Splitting them matters: the first list is a form to fill in, the second is
 * writing to do, and lumping them together made every unfilled address look
 * like an editing task.
 */
import { closeDb, db, legalDocuments, platformSettings } from '@softmato/db';

import { tokensIn } from '../apps/web/lib/cms/tokens';
import { definitionFor, resolve } from '../apps/web/lib/settings/registry';

const stored = await db
  .select({ key: platformSettings.key, value: platformSettings.value })
  .from(platformSettings);

const settings = resolve(new Map(stored.map((row) => [row.key, row.value])));

const rows = await db.select().from(legalDocuments);

/** setting key → documents that print it */
const blankSettings = new Map<string, Set<string>>();
/** literal marker text → documents that carry it */
const markers = new Map<string, Set<string>>();

function note(map: Map<string, Set<string>>, key: string, slug: string): void {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(slug);
}

for (const r of rows) {
  for (const { key, optional } of tokensIn(r.body)) {
    // An optional token that is blank is a decision already made, not a gap.
    if (optional) continue;
    if (!definitionFor(key)) {
      note(markers, `unknown setting ${key}`, r.slug);
      continue;
    }
    if (settings.text(key).trim() === '') note(blankSettings, key, r.slug);
  }

  for (const m of r.body.matchAll(/\[confirm:\s*([^\]]+)\]/g)) {
    note(markers, m[1]!.trim().replace(/\s+/g, ' '), r.slug);
  }
}

const bySpread = (a: [string, Set<string>], b: [string, Set<string>]) =>
  b[1].size - a[1].size;

if (blankSettings.size > 0) {
  console.log('Settings to fill in the admin panel:\n');

  for (const [key, slugs] of [...blankSettings].sort(bySpread)) {
    const label = definitionFor(key)?.label ?? key;
    console.log(`- ${label}  (${key})\n    ${[...slugs].sort().join(', ')}`);
  }
}

if (markers.size > 0) {
  console.log('\nMarkers still written into the documents:\n');

  for (const [fact, slugs] of [...markers].sort(bySpread)) {
    console.log(`- ${fact}\n    (${[...slugs].sort().join(', ')})`);
  }
}

console.log(
  `\n${blankSettings.size} settings and ${markers.size} markers across ` +
    `${rows.length} documents.`,
);

await closeDb();

/** Lists every distinct `[confirm: …]` fact the legal documents still need. */
import { closeDb, db, legalDocuments } from '@softmato/db';

const rows = await db.select().from(legalDocuments);
const byFact = new Map<string, Set<string>>();

for (const r of rows) {
  for (const m of r.body.matchAll(/\[confirm:\s*([^\]]+)\]/g)) {
    const fact = m[1]!.trim().replace(/\s+/g, ' ');
    if (!byFact.has(fact)) byFact.set(fact, new Set());
    byFact.get(fact)!.add(r.slug);
  }
}

const sorted = [...byFact.entries()].sort((a, b) => b[1].size - a[1].size);

for (const [fact, slugs] of sorted) {
  console.log(`- ${fact}\n    (${[...slugs].sort().join(', ')})`);
}

console.log(`\n${sorted.length} distinct facts across ${rows.length} documents.`);

await closeDb();

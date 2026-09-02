/**
 * Sets platform settings from the command line.
 *
 *     pnpm settings:set company.contact_email=info@softmato.com
 *     pnpm settings:set company.phone="+977 1 4000000" company.pan=123456789
 *
 * The admin panel is the normal way to do this. This exists for the values a
 * founder is pasting in for the first time, and for anything scripted — it
 * runs the **same `validate()` the form runs**, so a value that could not be
 * typed into the panel cannot be smuggled in through here either.
 *
 * `updated_by` is left null: no admin user did this, and recording one that
 * did not would put a false name in the audit trail.
 */
import { closeDb, db, platformSettings } from '@softmato/db';

import { definitionFor, validate } from '../apps/web/lib/settings/registry';

const pairs = process.argv.slice(2);

if (pairs.length === 0) {
  console.error('Usage: pnpm settings:set key=value [key=value …]');
  process.exit(1);
}

/** Parsed and checked before anything is written — all or nothing. */
const writes: { key: string; value: string }[] = [];
let bad = 0;

for (const pair of pairs) {
  const at = pair.indexOf('=');

  if (at === -1) {
    console.error(`✗ ${pair}\n    not a key=value pair`);
    bad += 1;
    continue;
  }

  const key = pair.slice(0, at).trim();
  const raw = pair.slice(at + 1);

  if (!definitionFor(key)) {
    console.error(`✗ ${key}\n    no such setting`);
    bad += 1;
    continue;
  }

  const checked = validate(key, raw);

  if (!checked.ok) {
    console.error(`✗ ${key}\n    ${checked.message}`);
    bad += 1;
    continue;
  }

  writes.push({ key, value: checked.value });
}

// One bad pair fails the batch. A half-applied set of contact details is worse
// than none: the policies would render some real and some placeholder.
if (bad > 0) {
  console.error(`\n${bad} rejected, nothing written.`);
  await closeDb();
  process.exit(1);
}

for (const { key, value } of writes) {
  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date(), updatedBy: null },
    });

  console.log(
    `✓ ${definitionFor(key)!.label}\n    ${key} = ${value || '(blank)'}`,
  );
}

console.log(`\n${writes.length} settings written.`);

await closeDb();

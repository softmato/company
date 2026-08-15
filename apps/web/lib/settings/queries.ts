import 'server-only';
import { cache } from 'react';
import { db, platformSettings } from '@softmato/db';

import { SETTING_DEFINITIONS } from './definitions';
import { resolve, type Settings } from './registry';

/**
 * Reads the settings table once per request.
 *
 * `cache` is React's per-request memo, not a time-based cache: a page that
 * reads three settings makes one query, and a change saved in the admin panel
 * is visible on the very next request. A stale invoice term would be worse
 * than an extra query.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings);

  return resolve(new Map(rows.map((row) => [row.key, row.value])));
});

/** Stored overrides only, for the admin form. Defaults fill the gaps there. */
export async function getStoredSettings(): Promise<Map<string, string>> {
  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings);

  const known = new Set(SETTING_DEFINITIONS.map((d) => d.key));

  // A row whose key was removed from the definitions is ignored rather than
  // shown — the code decides what exists.
  return new Map(
    rows.filter((row) => known.has(row.key)).map((r) => [r.key, r.value]),
  );
}

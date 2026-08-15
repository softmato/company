/**
 * Platform settings — the operational numbers a founder must be able to change
 * without a deploy: invoice terms, grace periods, refund windows, support
 * targets, the addresses printed on a policy.
 *
 * **Key–value on purpose, and narrow on purpose.** The rows here are overrides;
 * what settings *exist*, what type each one is, and what it defaults to are
 * defined in code (`apps/web/lib/settings/definitions.ts`). A key with no row
 * falls back to its coded default, so the platform boots correctly against an
 * empty table and a typo can never invent a setting nothing reads.
 *
 * What must NOT live here: anything the ledger depends on for correctness.
 * Account codes, posting rules and period boundaries are not settings — a
 * value that can change from a form must never be able to move posted money.
 */
import { sql } from 'drizzle-orm';
import { bigint, check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { adminUsers } from './audit';

export const platformSettings = pgTable(
  'platform_settings',
  {
    /** Dotted, lowercase: `billing.invoice_due_days`. */
    key: text('key').primaryKey(),
    /** Always text. The definition in code decides how to read it. */
    value: text('value').notNull(),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(
      () => adminUsers.id,
    ),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /*
     * `[.]` rather than `\.`: a backslash here passes through a JavaScript
     * template literal and then the generated SQL, and loses its meaning on
     * the way — leaving a constraint that says "any character" while claiming
     * to say "a dot". A character class survives both.
     */
    check(
      'platform_settings_key_format',
      sql`${t.key} ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$'`,
    ),
  ],
);

export type PlatformSetting = typeof platformSettings.$inferSelect;

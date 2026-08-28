/**
 * schema.sql SECTION 5 — payment providers.
 *
 * `config` holds non-secret settings only. Secrets are environment variables;
 * none of them ever reaches a client bundle (docs/RULES.md §6).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts';

export const paymentProviders = pgTable(
  'payment_providers',
  {
    id: text('id').primaryKey(), // 'fonepay' (primary), 'esewa', 'khalti'
    displayName: text('display_name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    /** Amount-based routing: hides wallets when the amount exceeds their limit. */
    minAmountMinor: bigint('min_amount_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    maxAmountMinor: bigint('max_amount_minor', { mode: 'bigint' }),
    supportsRefund: boolean('supports_refund').notNull().default(false),
    supportsCallback: boolean('supports_callback').notNull().default(false),
    requiresPolling: boolean('requires_polling').notNull().default(true),
    pollIntervalSec: integer('poll_interval_sec').notNull().default(60),
    pollTimeoutSec: integer('poll_timeout_sec').notNull().default(3600),
    balanceAccount: text('balance_account')
      .notNull()
      .references(() => accounts.code),
    feeAccount: text('fee_account')
      .notNull()
      .references(() => accounts.code),
    config: jsonb('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    sortOrder: smallint('sort_order').notNull().default(0),
  },
  (t) => [
    check(
      'limits_sane',
      sql`${t.maxAmountMinor} IS NULL OR ${t.maxAmountMinor} > ${t.minAmountMinor}`,
    ),
  ],
);

export type PaymentProvider = typeof paymentProviders.$inferSelect;

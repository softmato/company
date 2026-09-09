/**
 * schema.sql SECTION 1 — reference / dimensions.
 *
 * `products` lives here rather than in its own module because it is a ledger
 * dimension, not a domain of its own: `ledger_entries.product_id` is what makes
 * product-level P&L possible (see docs/ARCHITECTURE.md).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const productKind = pgEnum('product_kind', [
  'saas',
  'agency',
  'corporate',
]);

/**
 * Named so a form can accept one without importing the Drizzle enum object by
 * value — `@softmato/db` re-exports the `pg` client, so a `'use client'` file
 * that imports a value from here drags `dns`, `net` and `tls` into the browser
 * bundle. Types are erased; the list itself arrives as a prop.
 */
export type ProductKind = (typeof productKind.enumValues)[number];

export const products = pgTable('products', {
  id: text('id').primaryKey(), // 'hostelhub', 'questioncall'
  name: text('name').notNull(),
  kind: productKind('kind').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accountClass = pgEnum('account_class', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'direct_cost',
  'expense',
]);

export const normalBalance = pgEnum('normal_balance', ['debit', 'credit']);

export const accounts = pgTable(
  'accounts',
  {
    code: text('code').primaryKey(), // '1032'
    name: text('name').notNull(),
    class: accountClass('class').notNull(),
    normalBalance: normalBalance('normal_balance').notNull(),
    parentCode: text('parent_code').references(
      (): AnyPgColumn => accounts.code,
    ),
    isPostable: boolean('is_postable').notNull().default(true),
    isContra: boolean('is_contra').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    /** Provider balance accounts are reconciled against an external source. */
    reconcileSource: text('reconcile_source'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('accounts_parent_idx').on(t.parentCode),
    check('account_code_numeric', sql`${t.code} ~ '^[1-6][0-9]{3}$'`),
  ],
);

export type Product = typeof products.$inferSelect;
export type Account = typeof accounts.$inferSelect;

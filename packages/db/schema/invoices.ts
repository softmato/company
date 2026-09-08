/**
 * schema.sql SECTION 4 — invoices.
 *
 * Numbering is gapless and unique per fiscal year — `UNIQUE (fiscal_year,
 * sequence_no)` is the guarantee, `packages/accounting/numbering.ts` is the
 * allocator.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { accounts, products } from './accounts';
import { applications, credentialMode } from './applications';
import { customers } from './customers';

export const invoiceStatus = pgEnum('invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
  'written_off',
]);

export const invoices = pgTable(
  'invoices',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    invoiceNo: text('invoice_no').notNull(), // 'INV-2082/83-000001'
    fiscalYear: text('fiscal_year').notNull(),
    sequenceNo: bigint('sequence_no', { mode: 'number' }).notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    applicationId: bigint('application_id', { mode: 'number' }).references(
      () => applications.id,
    ),
    /**
     * Sandbox or Production, from the credential that created this invoice.
     *
     * An invoice is the start of the activity a payment finishes, so it
     * carries the same mark: a dashboard that separated payments but not the
     * invoices behind them would report a Production figure for money owed
     * and a Sandbox one for money taken.
     */
    mode: credentialMode('mode').notNull(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id),
    /** SaaS-side invoice id. */
    externalRef: text('external_ref'),
    status: invoiceStatus('status').notNull().default('draft'),
    subtotalMinor: bigint('subtotal_minor', { mode: 'bigint' }).notNull(),
    discountMinor: bigint('discount_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    taxMinor: bigint('tax_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    totalMinor: bigint('total_minor', { mode: 'bigint' }).notNull(),
    paidMinor: bigint('paid_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    tdsWithheldMinor: bigint('tds_withheld_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    currency: char('currency', { length: 3 }).notNull().default('NPR'),
    /** Deferred revenue window; NULL for one-off project invoices. */
    serviceStartsAt: timestamp('service_starts_at', { withTimezone: true }),
    serviceEndsAt: timestamp('service_ends_at', { withTimezone: true }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('invoices_fiscal_sequence_key').on(t.fiscalYear, t.sequenceNo),
    unique('invoices_invoice_no_key').on(t.invoiceNo),
    unique('invoices_application_external_key').on(
      t.applicationId,
      t.externalRef,
    ),
    index('invoices_customer_idx').on(t.customerId),
    index('invoices_status_idx')
      .on(t.status)
      .where(sql`${t.status} <> 'paid'`),
    check(
      'amounts_non_negative',
      sql`${t.subtotalMinor} >= 0 AND ${t.discountMinor} >= 0 AND ${t.taxMinor} >= 0 AND ${t.paidMinor} >= 0 AND ${t.tdsWithheldMinor} >= 0`,
    ),
    check(
      'total_consistent',
      sql`${t.totalMinor} = ${t.subtotalMinor} - ${t.discountMinor} + ${t.taxMinor}`,
    ),
    check('no_overpayment', sql`${t.paidMinor} <= ${t.totalMinor}`),
    check(
      'service_window_valid',
      sql`${t.serviceEndsAt} IS NULL OR ${t.serviceStartsAt} IS NULL OR ${t.serviceEndsAt} > ${t.serviceStartsAt}`,
    ),
  ],
);

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    invoiceId: bigint('invoice_id', { mode: 'number' })
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    lineNo: smallint('line_no').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 })
      .notNull()
      .default('1'),
    unitPriceMinor: bigint('unit_price_minor', { mode: 'bigint' }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    revenueAccount: text('revenue_account')
      .notNull()
      .references(() => accounts.code),
  },
  (t) => [
    unique('invoice_lines_invoice_line_key').on(t.invoiceId, t.lineNo),
    check('line_amount_positive', sql`${t.amountMinor} >= 0`),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;

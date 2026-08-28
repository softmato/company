/**
 * schema.sql SECTIONS 5–9 — sessions, transactions, refunds, provider events,
 * idempotency, outbound webhooks.
 *
 * Two constraints here carry most of the weight and must never be relaxed
 * (docs/RULES.md §3):
 *   * `UNIQUE (provider_id, provider_ref)` on transactions — the anti
 *     double-credit guard.
 *   * `succeeded_needs_journal` — a succeeded payment without a journal entry
 *     is money that moved without being recorded.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { products } from './accounts';
import { applications } from './applications';
import { customers } from './customers';
import { invoices } from './invoices';
import { journalEntries } from './ledger';
import { paymentProviders } from './providers';

// ── Sessions ────────────────────────────────────────────────────────────────

export const sessionStatus = pgEnum('session_status', [
  'created',
  'provider_selected',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
]);

export const paymentSessions = pgTable(
  'payment_sessions',
  {
    id: text('id').primaryKey(), // 'cs_live_<32 random bytes>'
    invoiceId: bigint('invoice_id', { mode: 'number' })
      .notNull()
      .references(() => invoices.id),
    applicationId: bigint('application_id', { mode: 'number' }).references(
      () => applications.id,
    ),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id),
    /** Recomputed server-side from the invoice. Never taken from the client. */
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('NPR'),
    status: sessionStatus('status').notNull().default('created'),
    allowedProviders: text('allowed_providers').array().notNull(),
    selectedProvider: text('selected_provider').references(
      () => paymentProviders.id,
    ),
    returnUrl: text('return_url'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('sessions_invoice_idx').on(t.invoiceId),
    index('sessions_expiry_idx')
      .on(t.expiresAt)
      .where(sql`${t.status} IN ('created','provider_selected','pending')`),
    check('session_amount_positive', sql`${t.amountMinor} > 0`),
    check('session_expiry_future', sql`${t.expiresAt} > ${t.createdAt}`),
    check(
      'session_id_format',
      sql`${t.id} ~ '^cs_(live|test)_[A-Za-z0-9_-]{32,}$'`,
    ),
  ],
);

// ── Transactions ────────────────────────────────────────────────────────────

export const txnStatus = pgEnum('txn_status', [
  'created',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
  'partially_refunded',
  'refunded',
  'reversed',
  'reconciliation_required',
]);

export const transactions = pgTable(
  'transactions',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    txnNo: text('txn_no').notNull().unique(), // 'TXN-2082/83-00000001'
    sessionId: text('session_id').references(() => paymentSessions.id),
    invoiceId: bigint('invoice_id', { mode: 'number' })
      .notNull()
      .references(() => invoices.id),
    applicationId: bigint('application_id', { mode: 'number' }).references(
      () => applications.id,
    ),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => paymentProviders.id),

    /** Khalti: pidx. eSewa: booking_id + correlation_id. */
    providerRef: text('provider_ref'),
    providerTxnId: text('provider_txn_id'),
    providerCorrelationId: text('provider_correlation_id'),

    status: txnStatus('status').notNull().default('created'),
    grossAmountMinor: bigint('gross_amount_minor', {
      mode: 'bigint',
    }).notNull(),
    /** Taken from the provider response. Never computed as a percentage. */
    providerFeeMinor: bigint('provider_fee_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    netAmountMinor: bigint('net_amount_minor', { mode: 'bigint' }).notNull(),
    refundedAmountMinor: bigint('refunded_amount_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    currency: char('currency', { length: 3 }).notNull().default('NPR'),

    journalId: bigint('journal_id', { mode: 'number' }).references(
      () => journalEntries.id,
    ),

    /** Polling state — Khalti has no webhook; this is the confirmation path. */
    pollAttempts: integer('poll_attempts').notNull().default(0),
    nextPollAt: timestamp('next_poll_at', { withTimezone: true }),
    lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),

    /**
     * Vestigial: these held the screenshot and the approving admin for the
     * `manual_qr` flow, removed on 2026-08-16. Nothing writes them now — every
     * payment is confirmed by a gateway, not by a person.
     *
     * Left in place rather than dropped. They are nullable and cost nothing,
     * and dropping columns from the payments table is a destructive migration
     * that should be its own reviewed change, not a side effect of deleting an
     * adapter. Drop them once it is certain no historical row uses them.
     */
    proofUrl: text('proof_url'),
    approvedBy: bigint('approved_by', { mode: 'number' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),

    failureCode: text('failure_code'),
    failureReason: text('failure_reason'),
    initiatedAt: timestamp('initiated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    succeededAt: timestamp('succeeded_at', { withTimezone: true }),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('transactions_provider_ref_key').on(t.providerId, t.providerRef),
    unique('transactions_provider_txn_key').on(t.providerId, t.providerTxnId),
    index('txn_invoice_idx').on(t.invoiceId),
    index('txn_product_idx').on(t.productId),
    index('txn_status_idx').on(t.status),
    index('txn_poll_idx')
      .on(t.nextPollAt)
      .where(sql`${t.status} IN ('created','pending')`),
    check('gross_positive', sql`${t.grossAmountMinor} > 0`),
    check('fee_non_negative', sql`${t.providerFeeMinor} >= 0`),
    check(
      'net_consistent',
      sql`${t.netAmountMinor} = ${t.grossAmountMinor} - ${t.providerFeeMinor}`,
    ),
    check(
      'refund_within_gross',
      sql`${t.refundedAmountMinor} <= ${t.grossAmountMinor}`,
    ),
    check(
      'succeeded_needs_time',
      sql`${t.status} <> 'succeeded' OR ${t.succeededAt} IS NOT NULL`,
    ),
    check(
      'succeeded_needs_journal',
      sql`${t.status} NOT IN ('succeeded','refunded','partially_refunded') OR ${t.journalId} IS NOT NULL`,
    ),
  ],
);

// ── Refunds ─────────────────────────────────────────────────────────────────

export const refundStatus = pgEnum('refund_status', [
  'requested',
  'approved',
  'pending',
  'succeeded',
  'failed',
  'rejected',
]);

export const refunds = pgTable(
  'refunds',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    refundNo: text('refund_no').notNull().unique(),
    transactionId: bigint('transaction_id', { mode: 'number' })
      .notNull()
      .references(() => transactions.id),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('NPR'),
    reason: text('reason').notNull(),
    status: refundStatus('status').notNull().default('requested'),
    providerRefundId: text('provider_refund_id'),
    journalId: bigint('journal_id', { mode: 'number' }).references(
      () => journalEntries.id,
    ),
    requestedBy: bigint('requested_by', { mode: 'number' }),
    approvedBy: bigint('approved_by', { mode: 'number' }),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('refunds_txn_idx').on(t.transactionId),
    check('refund_amount_positive', sql`${t.amountMinor} > 0`),
    // One founder cannot satisfy this alone. Flagged in MEMORY.md as an open
    // question; leave it until the founder decides. docs/RULES.md §3.
    check(
      'refund_needs_second_person',
      sql`${t.status} NOT IN ('approved','pending','succeeded') OR (${t.approvedBy} IS NOT NULL AND ${t.approvedBy} IS DISTINCT FROM ${t.requestedBy})`,
    ),
  ],
);

// ── Provider events (raw, immutable, deduplicated) ──────────────────────────

export const providerEvents = pgTable(
  'provider_events',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => paymentProviders.id),
    /** eSewa callback correlation_id, Khalti pidx+status, etc. */
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(), // 'callback','poll','settlement'
    signatureValid: boolean('signature_valid').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    headers: jsonb('headers').$type<Record<string, unknown>>(),
    transactionId: bigint('transaction_id', { mode: 'number' }).references(
      () => transactions.id,
    ),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The idempotency guarantee: the same event twice is one row.
    unique('provider_events_dedup_key').on(
      t.providerId,
      t.providerEventId,
      t.eventType,
    ),
    index('provider_events_unprocessed_idx')
      .on(t.receivedAt)
      .where(sql`${t.processedAt} IS NULL`),
  ],
);

// ── Idempotency & outbound webhooks ─────────────────────────────────────────

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').notNull(),
    applicationId: bigint('application_id', { mode: 'number' })
      .notNull()
      .references(() => applications.id),
    endpoint: text('endpoint').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: smallint('response_status'),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'idempotency_keys_pkey',
      columns: [t.applicationId, t.key],
    }),
    index('idempotency_expiry_idx').on(t.expiresAt),
  ],
);

export const deliveryStatus = pgEnum('delivery_status', [
  'pending',
  'delivered',
  'failed',
  'abandoned',
]);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    applicationId: bigint('application_id', { mode: 'number' })
      .notNull()
      .references(() => applications.id),
    eventType: text('event_type').notNull(), // 'payment.success'
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    signature: text('signature').notNull(),
    status: deliveryStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    lastStatusCode: smallint('last_status_code'),
    lastError: text('last_error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('webhook_retry_idx')
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export type PaymentSession = typeof paymentSessions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type ProviderEvent = typeof providerEvents.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

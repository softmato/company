/**
 * schema.sql SECTION 3 — API clients (the SaaS products calling the payment API).
 *
 * `secret_hash` is argon2id. The plaintext secret is shown once, at issue, and
 * never stored. docs/API.md §2.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { products } from './accounts';

export const APPLICATION_SCOPES = [
  'payment:create',
  'payment:read',
  'invoice:create',
  'invoice:read',
  'refund:request',
  'customer:read',
] as const;

export type ApplicationScope = (typeof APPLICATION_SCOPES)[number];

export const applications = pgTable(
  'applications',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    name: text('name').notNull(),
    clientId: text('client_id').notNull().unique(), // 'app_live_hostelhub_…'
    /** argon2id. Never the secret. */
    secretHash: text('secret_hash').notNull(),
    secretLast4: text('secret_last4').notNull(),
    scopes: text('scopes')
      .array()
      .$type<ApplicationScope[]>()
      .notNull()
      .default(sql`'{}'`),
    webhookUrl: text('webhook_url'),
    /** Signs outbound events. Never reaches a client bundle. */
    webhookSecret: text('webhook_secret'),
    /**
     * Rotation overlap (docs/API.md §2): the superseded secret keeps working
     * for 24 hours so a SaaS can redeploy without a window of 401s. Three
     * columns move together or not at all — a hash with no expiry would be a
     * second permanent credential, which is the opposite of rotating.
     */
    previousSecretHash: text('previous_secret_hash'),
    previousSecretLast4: text('previous_secret_last4'),
    previousSecretExpiresAt: timestamp('previous_secret_expires_at', {
      withTimezone: true,
    }),
    isLive: boolean('is_live').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('applications_product_idx').on(t.productId),
    check(
      'previous_secret_complete',
      sql`(${t.previousSecretHash} IS NULL AND ${t.previousSecretLast4} IS NULL AND ${t.previousSecretExpiresAt} IS NULL)
          OR (${t.previousSecretHash} IS NOT NULL AND ${t.previousSecretLast4} IS NOT NULL AND ${t.previousSecretExpiresAt} IS NOT NULL)`,
    ),
    check(
      'scopes_known',
      sql`${t.scopes} <@ ARRAY['payment:create','payment:read','invoice:create','invoice:read','refund:request','customer:read']::TEXT[]`,
    ),
  ],
);

export type Application = typeof applications.$inferSelect;

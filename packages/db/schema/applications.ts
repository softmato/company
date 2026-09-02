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
  uniqueIndex,
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

/**
 * The hostnames an application is allowed to send people to, and to receive
 * webhooks on. A secret answers "who is this"; this table answers "and where
 * may they send my customer".
 *
 * Written by an admin, signed in, in advance. Never sent by the caller and
 * never inferred from a request — a caller who can name their own return
 * address has an allowlist in name only.
 *
 * **No wildcards.** `*.questioncall.com` is not accepted, because a wildcard
 * is how an allowlist quietly becomes an allow-anything the day someone loses
 * control of a subdomain. List the subdomains.
 *
 * Matching is exact hostname equality — see `assertRegisteredHost` in
 * packages/payment-core/applications/domains.ts, which is the only place that
 * reads this table. `endsWith('questioncall.com')` would match
 * `evilquestioncall.com`, so the helper exists partly to make sure nobody
 * writes that at a call site.
 */
export const applicationDomains = pgTable(
  'application_domains',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    applicationId: bigint('application_id', { mode: 'number' })
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    /** `questioncall.com` — lowercase punycode, no scheme, port or path. */
    hostname: text('hostname').notNull(),
    /** Why it is on the list, for the admin reading it in a year. */
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** The admin who added it. */
    createdBy: text('created_by'),
  },
  (t) => [
    uniqueIndex('application_domains_unique').on(t.applicationId, t.hostname),
    index('application_domains_application_idx').on(t.applicationId),
    /*
     * The shape rules live in the database, not only in the form that writes
     * them. A hostname that arrived through a script, a migration or a psql
     * session is the one that will not have been normalised.
     */
    check(
      'hostname_is_bare_lowercase',
      sql`${t.hostname} = lower(${t.hostname})
          AND ${t.hostname} !~ '[/:*[:space:]]'
          AND ${t.hostname} ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
          AND ${t.hostname} !~ '\\.[0-9]+$'
          AND length(${t.hostname}) BETWEEN 4 AND 253`,
    ),
  ],
);

export type ApplicationDomain = typeof applicationDomains.$inferSelect;

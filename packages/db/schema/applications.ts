/**
 * schema.sql SECTION 3 — API clients (the SaaS products calling the payment API).
 *
 * Three tables, and the split between them is the point:
 *
 *   * `applications` — what the integration *is*. Its name, its product, what
 *     it is allowed to do. One row per integration, forever.
 *   * `application_credentials` — how it authenticates, once per mode. An
 *     application has at most one Sandbox credential and at most one
 *     Production credential, and each carries its own secrets, its own webhook
 *     address and its own signing key.
 *   * `application_domains` — where a credential may send a customer. Per
 *     **credential**, not per application.
 *
 * Before this, `is_live` was a column on `applications`, so a Sandbox
 * credential and a Production credential were two unrelated rows with two
 * unrelated names. Nothing linked them, the list page could not show that a
 * Production credential was missing, and "mint Sandbox at registration, add
 * Production later, rotate either from one page" could not be expressed.
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
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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

/**
 * What the register form ticks before an admin touches it.
 *
 * These four are exactly the scopes an endpoint enforces today — the four
 * calls of the documented happy path (docs/INTEGRATION.md §2): raise an
 * invoice, open a checkout, then read back the invoice and the receipt to show
 * the customer their records. An integration that cannot do all four cannot
 * complete the flow, so leaving them unticked only produces a credential that
 * 403s on its first real call.
 *
 * `refund:request` and `customer:read` are deliberately **not** here.
 * `refund:request` has a route behind it now, but most integrations never
 * file a refund and the ones that do should be a deliberate tick rather than a
 * default. `customer:read` still has no route at all.
 *
 * This is a default, not a policy: the form is free to untick any of them, and
 * `registerApplication` still refuses an empty set.
 */
export const DEFAULT_APPLICATION_SCOPES = [
  'payment:create',
  'payment:read',
  'invoice:create',
  'invoice:read',
] as const satisfies readonly ApplicationScope[];

/**
 * `test` and `live` in the column, Sandbox and Production in every word a
 * human reads.
 *
 * The identifiers cannot change: `app_test_…` and `cs_test_…` are already
 * minted into issued credentials and session ids, and renaming them would
 * invalidate every one. So the two vocabularies coexist, with a hard rule
 * about which goes where — see docs/API.md §2.
 */
export const credentialMode = pgEnum('credential_mode', ['test', 'live']);

export type CredentialMode = (typeof credentialMode.enumValues)[number];

/**
 * The only place that turns a mode into a word for a person.
 *
 * The rule above is easy to state and easy to drift from: four screens and
 * two scripts each wrote their own `mode === 'live' ? … : …`, and a single one
 * of them left saying "live" is how a vocabulary rots. A lookup cannot be
 * half-applied — either a call site uses it or the reviewer can see that it
 * does not.
 */
export const CREDENTIAL_MODE_LABEL: Record<CredentialMode, string> = {
  test: 'Sandbox',
  live: 'Production',
};

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
    /**
     * Shared by both credentials, deliberately.
     *
     * A scope describes what the integration *does*. It should not silently
     * differ between the credential somebody tested with and the one they went
     * live with — that is a class of bug that only ever appears in production,
     * on the day it matters.
     */
    scopes: text('scopes')
      .array()
      .$type<ApplicationScope[]>()
      .notNull()
      .default(sql`'{}'`),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('applications_product_idx').on(t.productId),
    check(
      'scopes_known',
      sql`${t.scopes} <@ ARRAY['payment:create','payment:read','invoice:create','invoice:read','refund:request','customer:read']::TEXT[]`,
    ),
  ],
);

export type Application = typeof applications.$inferSelect;

/**
 * One application's credential for one mode.
 *
 * `UNIQUE (application_id, mode)` is what makes "an application has a Sandbox
 * credential and a Production credential" a fact the database enforces rather
 * than a convention the UI hopes for. Minting a second Production credential
 * for the same application is a constraint violation, not a duplicate row
 * somebody notices later.
 *
 * **Revocation is per credential.** `revoked_at` lives here, not on
 * `applications`, so killing a Sandbox credential leaves Production
 * authenticating and vice versa. `applications.is_active` still turns the
 * whole integration off.
 */
export const applicationCredentials = pgTable(
  'application_credentials',
  {
    id: bigint('id', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    applicationId: bigint('application_id', { mode: 'number' })
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    mode: credentialMode('mode').notNull(),
    clientId: text('client_id').notNull().unique(), // 'app_live_hostelhub_…'
    /** argon2id. Never the secret. */
    secretHash: text('secret_hash').notNull(),
    secretLast4: text('secret_last4').notNull(),
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
    /** Signs outbound events. Never reaches a client bundle. */
    webhookSecret: text('webhook_secret'),
    webhookUrl: text('webhook_url'),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('application_credentials_mode_key').on(t.applicationId, t.mode),
    index('application_credentials_application_idx').on(t.applicationId),
    check(
      'previous_secret_complete',
      sql`(${t.previousSecretHash} IS NULL AND ${t.previousSecretLast4} IS NULL AND ${t.previousSecretExpiresAt} IS NULL)
          OR (${t.previousSecretHash} IS NOT NULL AND ${t.previousSecretLast4} IS NOT NULL AND ${t.previousSecretExpiresAt} IS NOT NULL)`,
    ),
    /*
     * The prefix and the column must agree.
     *
     * `generateClientId` builds `app_<mode>_<product>_<handle>`, so the mode is
     * already spelled inside the identifier that goes out to an integrator and
     * into our logs. Two places holding the same fact is two places to
     * disagree, and the disagreement would be invisible: a row labelled `test`
     * handing out a client id that reads `app_live_…`. The database refuses it
     * instead.
     */
    check(
      'client_id_matches_mode',
      sql`${t.clientId} LIKE 'app_' || ${t.mode}::TEXT || '\\_%'`,
    ),
  ],
);

export type ApplicationCredential = typeof applicationCredentials.$inferSelect;

/**
 * The hostnames a credential is allowed to send people to, and to receive
 * webhooks on. A secret answers "who is this"; this table answers "and where
 * may they send my customer".
 *
 * **Per credential, not per application.** A Sandbox integration points at
 * staging hosts and a Production one at real hosts, and letting a test
 * credential send a customer to the production site is exactly the confusion
 * this table exists to prevent.
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
    credentialId: bigint('credential_id', { mode: 'number' })
      .notNull()
      .references(() => applicationCredentials.id, { onDelete: 'cascade' }),
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
    uniqueIndex('application_domains_unique').on(t.credentialId, t.hostname),
    index('application_domains_credential_idx').on(t.credentialId),
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

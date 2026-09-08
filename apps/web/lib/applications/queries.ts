import 'server-only';
import { asc, eq, inArray, sql } from 'drizzle-orm';

import {
  applicationCredentials,
  applicationDomains,
  applications,
  db,
  products,
  type Application,
  type ApplicationDomain,
  type CredentialMode,
} from '@softmato/db';

/**
 * Admin-side reads for registered SaaS applications.
 *
 * `secret_hash` never leaves the database through here, and neither does
 * `webhook_secret` — the reads report only whether one exists. Reading the
 * signing secret is a separate, audited act (`revealWebhookSecret`), because
 * a read that hands over a live key is an event rather than a lookup.
 *
 * `secret_last4` is reported because an admin comparing a credential in a
 * support thread needs to identify it, and four characters identify without
 * authenticating.
 *
 * **The shape mirrors the schema: an application, and up to two credentials
 * hanging off it.** The screen draws one panel per mode, including for a mode
 * that has no credential yet — which is how the page says that a second set is
 * expected rather than missing.
 */

/** One credential set. Everything that differs between Sandbox and Production. */
export interface CredentialSummary {
  id: number;
  mode: CredentialMode;
  clientId: string;
  secretLast4: string;
  previousSecretLast4: string | null;
  previousSecretExpiresAt: Date | null;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  domainCount: number;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/** The integration itself. Shared by both credentials. */
export interface ApplicationSummary {
  id: number;
  name: string;
  productId: string;
  productName: string;
  scopes: Application['scopes'];
  isActive: boolean;
  createdAt: Date;
  credentials: CredentialSummary[];
}

export interface ApplicationDetail extends ApplicationSummary {
  /** Keyed by credential id — domains are per credential, not per application. */
  domainsByCredential: Record<number, ApplicationDomain[]>;
}

/**
 * The columns that are safe to select.
 *
 * `secretHash` and `webhookSecret` are absent by construction rather than
 * stripped afterwards — a `select()` with no argument would start leaking them
 * the day a column is added.
 */
const credentialColumns = {
  id: applicationCredentials.id,
  applicationId: applicationCredentials.applicationId,
  mode: applicationCredentials.mode,
  clientId: applicationCredentials.clientId,
  secretLast4: applicationCredentials.secretLast4,
  previousSecretLast4: applicationCredentials.previousSecretLast4,
  previousSecretExpiresAt: applicationCredentials.previousSecretExpiresAt,
  webhookUrl: applicationCredentials.webhookUrl,
  /*
   * Safe as a template: one column, one table in the FROM, nothing to
   * correlate. The counts below are not, and do not use this form — see
   * `domainCounts`.
   */
  hasWebhookSecret: sql<boolean>`${applicationCredentials.webhookSecret} IS NOT NULL`,
  rotatedAt: applicationCredentials.rotatedAt,
  revokedAt: applicationCredentials.revokedAt,
  createdAt: applicationCredentials.createdAt,
} as const;

/**
 * How many domains each credential has, as its own grouped query.
 *
 * **Not a correlated subquery in a `sql` template, and that is deliberate.**
 * Drizzle renders `${table.column}` inside a `sql` template *unqualified*, so
 * a correlated `WHERE ${applicationDomains.credentialId} = ${x.id}` comes out
 * as `WHERE "credential_id" = "id"` — and inside the subquery both names
 * resolve against `application_domains`, comparing a row's own two columns to
 * each other. It compiles, it runs, and it silently answers the wrong
 * question.
 *
 * That was live on the applications list before the credential split, counting
 * `application_domains.application_id = application_domains.id`. Nobody saw it
 * because the only application had no domains, so zero was right by accident.
 *
 * A `GROUP BY` costs one more round trip and cannot be wrong in that way.
 */
async function domainCounts(
  credentialIds: number[],
): Promise<Map<number, number>> {
  if (credentialIds.length === 0) return new Map();

  const rows = await db
    .select({
      credentialId: applicationDomains.credentialId,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationDomains)
    .where(inArray(applicationDomains.credentialId, credentialIds))
    .groupBy(applicationDomains.credentialId);

  return new Map(rows.map((row) => [row.credentialId, row.count]));
}

const applicationColumns = {
  id: applications.id,
  name: applications.name,
  productId: applications.productId,
  productName: products.name,
  scopes: applications.scopes,
  isActive: applications.isActive,
  createdAt: applications.createdAt,
} as const;

/** Sandbox first, then Production. The order the screens draw them in. */
const MODE_ORDER: CredentialMode[] = ['test', 'live'];

function byMode(a: CredentialSummary, b: CredentialSummary): number {
  return MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode);
}

export async function listApplications(): Promise<ApplicationSummary[]> {
  const rows = await db
    .select(applicationColumns)
    .from(applications)
    .innerJoin(products, eq(products.id, applications.productId))
    .orderBy(asc(products.name), asc(applications.name));

  const credentials = await db
    .select(credentialColumns)
    .from(applicationCredentials)
    .orderBy(asc(applicationCredentials.mode));

  const counts = await domainCounts(credentials.map((c) => c.id));

  return rows.map((row) => ({
    ...row,
    credentials: credentials
      .filter((c) => c.applicationId === row.id)
      .map((c) => stripApplicationId(c, counts.get(c.id) ?? 0))
      .sort(byMode),
  }));
}

export async function getApplicationDetail(
  id: number,
): Promise<ApplicationDetail | undefined> {
  const [row] = await db
    .select(applicationColumns)
    .from(applications)
    .innerJoin(products, eq(products.id, applications.productId))
    .where(eq(applications.id, id))
    .limit(1);

  if (!row) return undefined;

  const credentials = await db
    .select(credentialColumns)
    .from(applicationCredentials)
    .where(eq(applicationCredentials.applicationId, id));

  const counts = await domainCounts(credentials.map((c) => c.id));

  const domains = await db
    .select()
    .from(applicationDomains)
    .innerJoin(
      applicationCredentials,
      eq(applicationCredentials.id, applicationDomains.credentialId),
    )
    .where(eq(applicationCredentials.applicationId, id))
    .orderBy(asc(applicationDomains.hostname));

  const domainsByCredential: Record<number, ApplicationDomain[]> = {};

  for (const credential of credentials) domainsByCredential[credential.id] = [];

  for (const joined of domains) {
    const list = domainsByCredential[joined.application_domains.credentialId];
    if (list) list.push(joined.application_domains);
  }

  return {
    ...row,
    credentials: credentials
      .map((c) => stripApplicationId(c, counts.get(c.id) ?? 0))
      .sort(byMode),
    domainsByCredential,
  };
}

/**
 * `applicationId` is selected so the list query can group credentials by
 * application in one pass, and dropped before the row reaches a component —
 * which already knows which application it is drawing.
 */
function stripApplicationId(
  row: Omit<CredentialSummary, 'domainCount'> & { applicationId: number },
  domainCount: number,
): CredentialSummary {
  return {
    id: row.id,
    mode: row.mode,
    clientId: row.clientId,
    secretLast4: row.secretLast4,
    previousSecretLast4: row.previousSecretLast4,
    previousSecretExpiresAt: row.previousSecretExpiresAt,
    webhookUrl: row.webhookUrl,
    hasWebhookSecret: row.hasWebhookSecret,
    domainCount,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

/**
 * The facts an action needs before it decides how hard to make itself.
 *
 * Deliberately its own query rather than a field plucked off a bigger read.
 * Whether a credential is Production decides whether a password and a TOTP
 * code are demanded, so it must be read from the database on the request that
 * enforces it — never taken from a hidden form field, and never carried over
 * from a page render that happened before the row changed.
 *
 * The application's `name` comes with it because the other guard on the
 * destructive path — typing the name to confirm a revocation — has to compare
 * against the stored name for the same reason.
 */
export interface CredentialGate {
  applicationId: number;
  applicationName: string;
  mode: CredentialMode;
  isLive: boolean;
}

export async function credentialGate(
  credentialId: number,
): Promise<CredentialGate | undefined> {
  const [row] = await db
    .select({
      applicationId: applications.id,
      applicationName: applications.name,
      mode: applicationCredentials.mode,
    })
    .from(applicationCredentials)
    .innerJoin(
      applications,
      eq(applications.id, applicationCredentials.applicationId),
    )
    .where(eq(applicationCredentials.id, credentialId))
    .limit(1);

  if (!row) return undefined;

  return { ...row, isLive: row.mode === 'live' };
}

/**
 * The same, for the acts addressed by application rather than by credential.
 *
 * `hasProduction` is what gates editing the scopes: they are shared by both
 * credentials, so narrowing them on an application that has gone live is a
 * change to a Production integration even though the form says nothing about
 * modes.
 */
export interface ApplicationGate {
  name: string;
  hasProduction: boolean;
}

export async function applicationGate(
  applicationId: number,
): Promise<ApplicationGate | undefined> {
  const [row] = await db
    .select({
      name: applications.name,
      /*
       * Written with literal, qualified table names rather than
       * `${table.column}`. Drizzle renders those unqualified inside a `sql`
       * template, so the correlation `c.application_id = applications.id`
       * would come out as `"application_id" = "id"` and bind both sides to
       * `application_credentials` — always false here, silently.
       */
      hasProduction: sql<boolean>`EXISTS (
        SELECT 1 FROM application_credentials c
        WHERE c.application_id = applications.id
          AND c.mode = 'live'
          AND c.revoked_at IS NULL
      )`,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  return row;
}

export interface ProductOption {
  id: string;
  name: string;
}

export async function listProductOptions(): Promise<ProductOption[]> {
  return db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));
}

export async function findApplication(
  id: number,
): Promise<Application | undefined> {
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  return row;
}

export interface ProductWithApplicationCount extends ProductOption {
  kind: string;
  isActive: boolean;
  applicationCount: number;
  liveApplicationCount: number;
}

/**
 * For the products screen, which lists the ledger dimension and says how many
 * credentials hang off each one. The credentials themselves live at
 * `/admin/applications` — there is one screen that mints and revokes them, so
 * there is one place to look when asking what a credential may do.
 *
 * `liveApplicationCount` counts **Production credentials**, not applications:
 * an application with only a Sandbox credential cannot take a real payment,
 * and that is the number this column is read for.
 */
export async function listProductsWithApplicationCounts(): Promise<
  ProductWithApplicationCount[]
> {
  return db
    .select({
      id: products.id,
      name: products.name,
      kind: products.kind,
      isActive: products.isActive,
      // Literal names, for the reason spelled out in `domainCounts`.
      applicationCount: sql<number>`(
        SELECT count(*)::int FROM applications a
        WHERE a.product_id = products.id
      )`,
      liveApplicationCount: sql<number>`(
        SELECT count(*)::int FROM application_credentials c
        JOIN applications a ON a.id = c.application_id
        WHERE a.product_id = products.id
          AND c.mode = 'live'
          AND c.revoked_at IS NULL
      )`,
    })
    .from(products)
    .orderBy(asc(products.name));
}

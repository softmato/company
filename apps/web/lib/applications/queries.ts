import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';

import {
  applicationDomains,
  applications,
  db,
  products,
  type Application,
  type ApplicationDomain,
} from '@softmato/db';

/**
 * Admin-side reads for registered SaaS applications.
 *
 * `secret_hash` never leaves the database through here, and neither does
 * `webhook_secret` — the list reports only whether one exists. Reading the
 * signing secret is a separate, audited act (`revealWebhookSecret`), because
 * a read that hands over a live key is an event rather than a lookup.
 *
 * The list shows `secret_last4` because an admin comparing a credential in a
 * support thread needs to identify it, and four characters identify without
 * authenticating.
 */

export interface ApplicationSummary {
  id: number;
  name: string;
  clientId: string;
  productId: string;
  productName: string;
  scopes: Application['scopes'];
  secretLast4: string;
  previousSecretLast4: string | null;
  previousSecretExpiresAt: Date | null;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  domainCount: number;
  isLive: boolean;
  isActive: boolean;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ApplicationDetail extends ApplicationSummary {
  domains: ApplicationDomain[];
}

/** The columns that are safe to select. `secretHash` and `webhookSecret` are
 * absent by construction rather than stripped afterwards — a `select()` with
 * no argument would start leaking them the day a column is added. */
const summaryColumns = {
  id: applications.id,
  name: applications.name,
  clientId: applications.clientId,
  productId: applications.productId,
  productName: products.name,
  scopes: applications.scopes,
  secretLast4: applications.secretLast4,
  previousSecretLast4: applications.previousSecretLast4,
  previousSecretExpiresAt: applications.previousSecretExpiresAt,
  webhookUrl: applications.webhookUrl,
  hasWebhookSecret: sql<boolean>`${applications.webhookSecret} IS NOT NULL`,
  domainCount: sql<number>`(
    SELECT count(*)::int FROM ${applicationDomains}
    WHERE ${applicationDomains.applicationId} = ${applications.id}
  )`,
  isLive: applications.isLive,
  isActive: applications.isActive,
  rotatedAt: applications.rotatedAt,
  revokedAt: applications.revokedAt,
  createdAt: applications.createdAt,
} as const;

export async function listApplications(): Promise<ApplicationSummary[]> {
  return db
    .select(summaryColumns)
    .from(applications)
    .innerJoin(products, eq(products.id, applications.productId))
    .orderBy(asc(products.name), asc(applications.name));
}

export async function getApplicationDetail(
  id: number,
): Promise<ApplicationDetail | undefined> {
  const [row] = await db
    .select(summaryColumns)
    .from(applications)
    .innerJoin(products, eq(products.id, applications.productId))
    .where(eq(applications.id, id))
    .limit(1);

  if (!row) return undefined;

  const domains = await db
    .select()
    .from(applicationDomains)
    .where(eq(applicationDomains.applicationId, id))
    .orderBy(asc(applicationDomains.hostname));

  return { ...row, domains };
}

/**
 * The two facts an action needs before it decides how hard to make itself.
 *
 * Deliberately its own query rather than a field plucked off
 * `getApplicationDetail`. Whether a credential is Production decides whether a
 * password and a TOTP code are demanded, so it must be read from the database
 * on the request that enforces it — never taken from a hidden form field, and
 * never carried over from a page render that happened before the row changed.
 * A one-row, two-column read is cheap enough that there is no argument for
 * reusing a bigger one.
 *
 * `name` comes back with it because the other guard on the destructive path —
 * typing the application's name to confirm a revocation — has to compare
 * against the stored name for the same reason.
 */
export interface CredentialGate {
  name: string;
  isLive: boolean;
}

export async function credentialGate(
  id: number,
): Promise<CredentialGate | undefined> {
  const [row] = await db
    .select({ name: applications.name, isLive: applications.isLive })
    .from(applications)
    .where(eq(applications.id, id))
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
      applicationCount: sql<number>`(
        SELECT count(*)::int FROM ${applications}
        WHERE ${applications.productId} = ${products.id}
      )`,
      liveApplicationCount: sql<number>`(
        SELECT count(*)::int FROM ${applications}
        WHERE ${applications.productId} = ${products.id}
          AND ${applications.isLive}
          AND ${applications.revokedAt} IS NULL
      )`,
    })
    .from(products)
    .orderBy(asc(products.name));
}

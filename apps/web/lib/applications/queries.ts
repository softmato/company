import 'server-only';
import { asc, eq } from 'drizzle-orm';

import { applications, db, products, type Application } from '@softmato/db';

/**
 * Admin-side reads for registered SaaS applications.
 *
 * `secret_hash` never leaves the database through here. The list shows
 * `secret_last4` because an admin comparing a credential in a support thread
 * needs to identify it, and four characters identify without authenticating.
 */

export interface ApplicationSummary {
  id: number;
  name: string;
  clientId: string;
  productId: string;
  scopes: Application['scopes'];
  secretLast4: string;
  previousSecretLast4: string | null;
  previousSecretExpiresAt: Date | null;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  isLive: boolean;
  isActive: boolean;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ProductWithApplications {
  id: string;
  name: string;
  kind: string;
  isActive: boolean;
  applications: ApplicationSummary[];
}

export async function listProductsWithApplications(): Promise<
  ProductWithApplications[]
> {
  const [productRows, applicationRows] = await Promise.all([
    db.select().from(products).orderBy(asc(products.name)),
    db
      .select({
        id: applications.id,
        name: applications.name,
        clientId: applications.clientId,
        productId: applications.productId,
        scopes: applications.scopes,
        secretLast4: applications.secretLast4,
        previousSecretLast4: applications.previousSecretLast4,
        previousSecretExpiresAt: applications.previousSecretExpiresAt,
        webhookUrl: applications.webhookUrl,
        webhookSecret: applications.webhookSecret,
        isLive: applications.isLive,
        isActive: applications.isActive,
        rotatedAt: applications.rotatedAt,
        revokedAt: applications.revokedAt,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .orderBy(asc(applications.name)),
  ]);

  return productRows.map((product) => ({
    id: product.id,
    name: product.name,
    kind: product.kind,
    isActive: product.isActive,
    applications: applicationRows
      .filter((row) => row.productId === product.id)
      .map(({ webhookSecret, ...row }) => ({
        ...row,
        // Whether one exists, never the value itself.
        hasWebhookSecret: webhookSecret !== null,
      })),
  }));
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

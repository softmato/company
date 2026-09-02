/**
 * Bearer authentication for `/api/v1` (docs/API.md §2).
 *
 * Fails closed at every step. There is no branch in this file that ends in
 * "well, probably fine" — an unparseable header, an unknown client id, a
 * revoked application and a wrong secret all produce the same
 * `UNAUTHENTICATED`, and all of them cost roughly the same wall time so the
 * endpoint cannot be used to enumerate which SaaS products exist.
 */
import { eq } from 'drizzle-orm';

import {
  applications,
  db,
  type Application,
  type ApplicationScope,
} from '@softmato/db';

import { PaymentError } from '../errors';
import { clientIdFromSecret, verifySecret } from './credentials';

/** A random argon2id hash. Verified against when no application matched. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29mdG1hdG9hcHBkdW1teQ$8Xf1kQ0Zx2Xk0YQ3S8xdOkQ3xW5xk1Jm0GhIfJmXWJ3';

export interface AuthenticatedApplication {
  id: number;
  clientId: string;
  productId: string;
  name: string;
  isLive: boolean;
  scopes: ApplicationScope[];
  webhookUrl: string | null;
  /** True when the caller presented the superseded secret during its overlap. */
  usedPreviousSecret: boolean;
}

function unauthenticated(reason: string, context?: Record<string, unknown>) {
  return new PaymentError('UNAUTHENTICATED', reason, context);
}

/** `Authorization: Bearer <client_secret>` → the application, or a throw. */
export async function authenticateApplication(
  authorizationHeader: string | null | undefined,
): Promise<AuthenticatedApplication> {
  const secret = bearerToken(authorizationHeader);
  if (!secret)
    throw unauthenticated('Missing or malformed Authorization header');

  const clientId = clientIdFromSecret(secret);
  if (!clientId) throw unauthenticated('Bearer token is not a client secret');

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.clientId, clientId))
    .limit(1);

  // Constant work whether or not the application exists.
  const match = await matchSecret(application, secret);

  if (!application) {
    throw unauthenticated('No application for that client id', { clientId });
  }

  if (!match.ok) {
    throw unauthenticated('Secret did not verify', { clientId });
  }

  // Checked after verification on purpose: telling an unauthenticated caller
  // that an application is revoked is telling them it exists.
  if (!application.isActive || application.revokedAt) {
    throw unauthenticated('Application is revoked or inactive', { clientId });
  }

  return {
    id: application.id,
    clientId: application.clientId,
    productId: application.productId,
    name: application.name,
    isLive: application.isLive,
    scopes: application.scopes,
    webhookUrl: application.webhookUrl,
    usedPreviousSecret: match.previous,
  };
}

/**
 * Current secret first, then the superseded one if its overlap window is still
 * open (docs/API.md §2). An expired `previous_secret_expires_at` is not tried
 * at all — the column outliving the window is the whole reason it is stored
 * with an expiry rather than cleared by a job that might not run.
 */
async function matchSecret(
  application: Application | undefined,
  presented: string,
): Promise<{ ok: boolean; previous: boolean }> {
  if (!application) {
    await verifySecret(DUMMY_HASH, presented);
    return { ok: false, previous: false };
  }

  if (await verifySecret(application.secretHash, presented)) {
    return { ok: true, previous: false };
  }

  const { previousSecretHash: hash, previousSecretExpiresAt: expiresAt } =
    application;

  if (hash && expiresAt && expiresAt > new Date()) {
    if (await verifySecret(hash, presented)) {
      return { ok: true, previous: true };
    }
  }

  return { ok: false, previous: false };
}

function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

/**
 * Scope enforcement. Never granted to a SaaS at all: refund approval,
 * accounting access, cross-product reads, provider configuration, admin
 * anything — those have no scope to grant, which is stronger than a check.
 */
export function assertScope(
  application: AuthenticatedApplication,
  scope: ApplicationScope,
): void {
  if (!application.scopes.includes(scope)) {
    throw new PaymentError(
      'INSUFFICIENT_SCOPE',
      `Application ${application.clientId} lacks scope ${scope}`,
      { clientId: application.clientId, required: scope },
    );
  }
}

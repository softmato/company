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
  applicationCredentials,
  applications,
  db,
  type ApplicationCredential,
  type ApplicationScope,
  type CredentialMode,
} from '@softmato/db';

import { PaymentError } from '../errors';
import { clientIdFromSecret, verifySecret } from './credentials';

/** A random argon2id hash. Verified against when no application matched. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29mdG1hdG9hcHBkdW1teQ$8Xf1kQ0Zx2Xk0YQ3S8xdOkQ3xW5xk1Jm0GhIfJmXWJ3';

export interface AuthenticatedApplication {
  /** The application, not the credential. Payments belong to this. */
  id: number;
  /** The credential that authenticated. Rotation and revocation act on this. */
  credentialId: number;
  clientId: string;
  productId: string;
  name: string;
  /**
   * Which credential set this is.
   *
   * **It isolates nothing on its own.** It picks the `cs_test_` / `cs_live_`
   * session prefix and nothing else: not the provider, not the gateway, not
   * whether a journal posts. What decides whether real money moves is
   * `PAYMENT_MODE`, read at boot and deployment-wide. A Sandbox credential
   * used against the production deployment takes real money.
   */
  mode: CredentialMode;
  scopes: ApplicationScope[];
  webhookUrl: string | null;
  /** True when the caller presented the superseded secret during its overlap. */
  usedPreviousSecret: boolean;
  /**
   * When the superseded secret stops working — set only when this request
   * used it, `null` otherwise.
   *
   * The boolean above has existed since rotation shipped and nothing read
   * it, so during the 24 hours an integrator had to notice, they were told
   * nothing at all, and at hour 24 their integration simply began failing.
   * A boolean cannot say *when*, and "when" is the entire content of the
   * warning, so the timestamp comes out with it.
   */
  previousSecretExpiresAt: Date | null;
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

  /*
   * One query, joining the credential to the integration it belongs to. The
   * client id is unique across `application_credentials`, so this is still a
   * single index hit — the credential set an integrator holds is what
   * identifies them, and the application is what it hangs off.
   */
  const [found] = await db
    .select({
      credential: applicationCredentials,
      applicationId: applications.id,
      productId: applications.productId,
      name: applications.name,
      scopes: applications.scopes,
      isActive: applications.isActive,
    })
    .from(applicationCredentials)
    .innerJoin(
      applications,
      eq(applications.id, applicationCredentials.applicationId),
    )
    .where(eq(applicationCredentials.clientId, clientId))
    .limit(1);

  // Constant work whether or not the credential exists.
  const match = await matchSecret(found?.credential, secret);

  if (!found) {
    throw unauthenticated('No credential for that client id', { clientId });
  }

  if (!match.ok) {
    throw unauthenticated('Secret did not verify', { clientId });
  }

  /*
   * Checked after verification on purpose: telling an unauthenticated caller
   * that a credential is revoked is telling them it exists.
   *
   * Both are checked. `credential.revoked_at` kills one credential set and
   * leaves the other authenticating; `application.is_active` turns the whole
   * integration off. Neither implies the other.
   */
  if (!found.isActive || found.credential.revokedAt) {
    throw unauthenticated(
      'Credential is revoked, or its application is inactive',
      {
        clientId,
      },
    );
  }

  const result: AuthenticatedApplication = {
    id: found.applicationId,
    credentialId: found.credential.id,
    clientId: found.credential.clientId,
    productId: found.productId,
    name: found.name,
    mode: found.credential.mode,
    scopes: found.scopes,
    webhookUrl: found.credential.webhookUrl,
    usedPreviousSecret: match.previous,
    previousSecretExpiresAt: match.previous
      ? (found.credential.previousSecretExpiresAt ?? null)
      : null,
  };

  /*
   * Record that the old secret was used, without making the caller wait for
   * it and without letting it fail the request.
   *
   * Deliberately after the result is built and deliberately not awaited.
   * Authentication is the hot path on every `/v1` call, and this write is
   * bookkeeping for a human reading a screen later — a database hiccup here
   * must not turn a good request into a `500`. It only runs during the
   * overlap window, so it is a handful of writes over 24 hours, not one per
   * request.
   */
  if (match.previous) {
    void db
      .update(applicationCredentials)
      .set({ previousSecretLastUsedAt: new Date() })
      .where(eq(applicationCredentials.id, found.credential.id))
      .catch(() => {});
  }

  return result;
}

/**
 * Current secret first, then the superseded one if its overlap window is still
 * open (docs/API.md §2). An expired `previous_secret_expires_at` is not tried
 * at all — the column outliving the window is the whole reason it is stored
 * with an expiry rather than cleared by a job that might not run.
 */
async function matchSecret(
  credential: ApplicationCredential | undefined,
  presented: string,
): Promise<{ ok: boolean; previous: boolean }> {
  if (!credential) {
    await verifySecret(DUMMY_HASH, presented);
    return { ok: false, previous: false };
  }

  if (await verifySecret(credential.secretHash, presented)) {
    return { ok: true, previous: false };
  }

  const { previousSecretHash: hash, previousSecretExpiresAt: expiresAt } =
    credential;

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

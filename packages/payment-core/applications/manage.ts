/**
 * Issue, rotate and revoke API credentials (docs/API.md §2).
 *
 * Every function here returns the plaintext secret exactly once. Nothing
 * stores it, nothing logs it, and the audit entries deliberately record only
 * the last four characters — a credential change that writes the credential
 * into the audit log has not been audited, it has been published.
 */
import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import {
  applicationCredentials,
  applicationDomains,
  applications,
  db,
  products,
  type Application,
  type ApplicationCredential,
  CREDENTIAL_MODE_LABEL,
  type ApplicationScope,
  type CredentialMode,
  type ProductKind,
} from '@softmato/db';

import type { Actor, AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import { generateClientId, issueSecret } from './credentials';
import {
  assertRegisteredHost,
  normalizeHostname,
  normalizeHostnameInput,
} from './domains';
import { assertLoopbackAllowed, isLoopbackHostname } from './loopback';
import { normalizeProductId } from './product-slug';

/** docs/API.md §2 — "Rotation issues a new secret with a 24-hour overlap." */
const ROTATION_OVERLAP_MS = 24 * 60 * 60 * 1000;

export interface DomainInput {
  /** Bare host: `questioncall.com`. No scheme, port or path. */
  hostname: string;
  note?: string | null;
}

/**
 * A product line that does not exist yet, created in the same transaction as
 * the application that needs it.
 *
 * Same transaction rather than a separate call, because the alternative is a
 * products row for an application that then failed to register — an orphan
 * ledger dimension nobody can see the purpose of, and no screen to delete it
 * from. Either both rows exist or neither does.
 *
 * `id` is checked by `normalizeProductId`: it is minted into every client id
 * this product ever issues and cannot be changed afterwards.
 */
export interface NewProductInput {
  name: string;
  kind: ProductKind;
}

export interface RegisterInput {
  /**
   * The product this integration bills to. When `newProduct` is present this
   * is the id being created; otherwise it names an existing row.
   */
  productId: string;
  /** Set to create `productId` rather than expect it. */
  newProduct?: NewProductInput;
  name: string;
  scopes: ApplicationScope[];
  webhookUrl?: string | null;
  /** Which credential set to mint. Registration mints Sandbox; see item 8. */
  mode: CredentialMode;
  /**
   * At least one. Registered in the same transaction as the credential, so
   * a credential cannot exist for even a moment without its allowlist — one
   * that is briefly allowed to send customers anywhere is one that will be
   * used in exactly that window.
   */
  domains: DomainInput[];
}

export interface IssuedCredential {
  application: Application;
  credential: ApplicationCredential;
  /** Displayed once. There is no second chance to read this. */
  secret: string;
}

export async function registerApplication(
  input: RegisterInput,
  actor: Actor,
  audit: AuditRecorder,
): Promise<IssuedCredential> {
  const productId = resolveProductId(input);
  const hostnames = normalizeDomains(input.domains, input.mode);

  /*
   * The webhook URL is checked against the domains arriving on this same
   * request rather than against the table, because neither exists yet. Doing
   * it before the insert means a form that names a webhook host it forgot to
   * register fails with nothing written, instead of leaving an application
   * whose webhook address skipped validation because it came in through the
   * back door.
   */
  if (input.webhookUrl) {
    const host = normalizeHostname(input.webhookUrl);

    if (host === null) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'webhook_url must be an absolute https:// URL with a valid hostname',
        { field: 'webhookUrl' },
      );
    }

    /*
     * `normalizeHostname` already knows whether the deployment is local; only
     * the mode is left, and here it is the mode being minted rather than one
     * to read back — there is no credential yet.
     */
    if (isLoopbackHostname(host)) {
      assertLoopbackAllowed(host, input.mode, 'webhookUrl');
    }

    if (!hostnames.some((domain) => domain.hostname === host)) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `webhook_url points at "${host}", which is not one of the domains being registered. Add it to the domain list.`,
        { field: 'webhookUrl', hostname: host },
      );
    }
  }

  const clientId = generateClientId(productId, input.mode);
  const { secret, secretHash, secretLast4 } = await issueSecret(clientId);

  const created = await db.transaction(async (tx) => {
    if (input.newProduct) {
      /*
       * `onConflictDoNothing` and then a check, rather than letting the
       * primary key throw: a bare Postgres constraint message is not an
       * answer, and "that id is taken" is the only thing the admin needs to
       * know. The insert is inside the transaction, so a collision rolls the
       * application back with it.
       */
      const [product] = await tx
        .insert(products)
        .values({
          id: productId,
          name: input.newProduct.name,
          kind: input.newProduct.kind,
        })
        .onConflictDoNothing({ target: products.id })
        .returning();

      if (!product) {
        throw new PaymentError(
          'VALIDATION_FAILED',
          `A product with the id "${productId}" already exists. Pick it from the list instead of creating it.`,
          { field: 'newProductId', productId },
        );
      }

      await audit(
        {
          actorType: actor.type,
          actorId: actor.id,
          action: 'product.create',
          resourceType: 'product',
          resourceId: productId,
          afterState: { name: product.name, kind: product.kind },
        },
        tx,
      );
    }

    const [application] = await tx
      .insert(applications)
      .values({
        productId,
        name: input.name,
        scopes: input.scopes,
      })
      .returning();

    if (!application) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Application insert returned no row',
        { clientId },
      );
    }

    const [credential] = await tx
      .insert(applicationCredentials)
      .values({
        applicationId: application.id,
        mode: input.mode,
        clientId,
        secretHash,
        secretLast4,
        webhookUrl: input.webhookUrl ?? null,
        // Signs outbound events. Never reaches a client bundle (RULES.md §6).
        webhookSecret: randomBytes(32).toString('base64url'),
      })
      .returning();

    if (!credential) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Credential insert returned no row',
        { clientId },
      );
    }

    await tx.insert(applicationDomains).values(
      hostnames.map((domain) => ({
        credentialId: credential.id,
        hostname: domain.hostname,
        note: domain.note,
        createdBy: actor.id,
      })),
    );

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.register',
        resourceType: 'application',
        resourceId: String(application.id),
        afterState: {
          clientId,
          credentialId: credential.id,
          productId,
          scopes: input.scopes,
          mode: input.mode,
          secretLast4,
          domains: hostnames.map((domain) => domain.hostname),
        },
      },
      tx,
    );

    return { application, credential };
  });

  return { ...created, secret };
}

/**
 * The second credential set, minted later from the same application.
 *
 * This is the whole point of the split: an admin registers QuestionCall once,
 * gets a Sandbox credential, and adds Production when the integration is ready
 * — same name, same product, same scopes, its own secrets and its own domain
 * list.
 *
 * **It refuses when that mode already exists.** `UNIQUE (application_id, mode)`
 * would refuse it anyway; this turns a constraint violation into a sentence an
 * admin can read.
 *
 * Domains start empty on purpose. The Sandbox credential points at staging
 * hosts and the Production one does not, so copying the list across would seed
 * the exact confusion the per-credential allowlist exists to prevent. The
 * detail page shows an empty list and the checkout endpoint refuses every
 * `return_url` until an admin fills it in, which is the safe direction to fail.
 */
export async function addCredential(
  applicationId: number,
  mode: CredentialMode,
  actor: Actor,
  audit: AuditRecorder,
): Promise<IssuedCredential> {
  return db.transaction(async (tx) => {
    const [application] = await tx
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for('update')
      .limit(1);

    if (!application) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such application', {
        applicationId,
      });
    }

    /*
     * A **revoked** credential does not hold the slot. It used to, because
     * this read had no `revoked_at` filter and the unique constraint behind
     * it had no `WHERE` clause, so revoking Production was terminal for that
     * application: no button, no API, no way back short of a new application.
     * Revocation is meant to kill a key, not a mode.
     */
    const [existing] = await tx
      .select({ id: applicationCredentials.id })
      .from(applicationCredentials)
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          eq(applicationCredentials.mode, mode),
          isNull(applicationCredentials.revokedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new PaymentError(
        'INVALID_STATE',
        `This application already has a live ${CREDENTIAL_MODE_LABEL[mode]} credential. Rotate it rather than minting a second.`,
        { applicationId, mode },
      );
    }

    const clientId = generateClientId(application.productId, mode);
    const { secret, secretHash, secretLast4 } = await issueSecret(clientId);

    const [credential] = await tx
      .insert(applicationCredentials)
      .values({
        applicationId,
        mode,
        clientId,
        secretHash,
        secretLast4,
        webhookSecret: randomBytes(32).toString('base64url'),
      })
      .returning();

    if (!credential) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Credential insert returned no row',
        { clientId },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.add_credential',
        resourceType: 'application',
        resourceId: String(applicationId),
        afterState: {
          clientId,
          credentialId: credential.id,
          mode,
          secretLast4,
        },
      },
      tx,
    );

    return { application, credential, secret };
  });
}

export interface RotationResult {
  credential: ApplicationCredential;
  secret: string;
  /** Until when the superseded secret keeps working. */
  previousSecretExpiresAt: Date;
}

/**
 * The old secret keeps working for 24 hours so a SaaS can redeploy without a
 * window of 401s. Rotating twice inside that window discards the oldest secret
 * rather than keeping three alive — an overlap is a grace period, not a
 * growing set of keys.
 */
export async function rotateSecret(
  credentialId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<RotationResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(applicationCredentials)
      .where(eq(applicationCredentials.id, credentialId))
      .for('update')
      .limit(1);

    if (!existing) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such credential', {
        credentialId,
      });
    }

    if (existing.revokedAt) {
      throw new PaymentError(
        'INVALID_STATE',
        'A revoked credential cannot rotate its secret; mint a new one',
        { credentialId },
      );
    }

    /*
     * The same client id keeps its secret rotated under it. The identifier is
     * how an integrator, a log line and this table all name the credential —
     * changing it on rotation would turn a 24-hour grace period into a
     * re-registration.
     */
    const { secret, secretHash, secretLast4 } = await issueSecret(
      existing.clientId,
    );
    const now = new Date();
    const previousSecretExpiresAt = new Date(
      now.getTime() + ROTATION_OVERLAP_MS,
    );

    const [updated] = await tx
      .update(applicationCredentials)
      .set({
        secretHash,
        secretLast4,
        previousSecretHash: existing.secretHash,
        previousSecretLast4: existing.secretLast4,
        previousSecretExpiresAt,
        rotatedAt: now,
      })
      .where(eq(applicationCredentials.id, credentialId))
      .returning();

    if (!updated) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'Rotation updated no row', {
        credentialId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.rotate_secret',
        resourceType: 'application_credential',
        resourceId: String(credentialId),
        beforeState: { secretLast4: existing.secretLast4 },
        afterState: {
          mode: existing.mode,
          secretLast4,
          previousSecretExpiresAt: previousSecretExpiresAt.toISOString(),
        },
      },
      tx,
    );

    return { credential: updated, secret, previousSecretExpiresAt };
  });
}

/**
 * Revocation is immediate (docs/API.md §2) — including for the secret that was
 * mid-overlap, which is the only reason the overlap columns are cleared here
 * rather than left to expire on their own.
 *
 * **It revokes one credential, not the integration.** Killing a Sandbox
 * credential must leave Production authenticating: they are separate keys, and
 * the reason to kill one is rarely a reason to kill the other. Turning the
 * whole integration off is `applications.is_active`, which is a different act
 * with a different blast radius.
 */
export async function revokeCredential(
  credentialId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<ApplicationCredential> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(applicationCredentials)
      .where(eq(applicationCredentials.id, credentialId))
      .for('update')
      .limit(1);

    if (!existing) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such credential', {
        credentialId,
      });
    }

    const [updated] = await tx
      .update(applicationCredentials)
      .set({
        revokedAt: existing.revokedAt ?? new Date(),
        previousSecretHash: null,
        previousSecretLast4: null,
        previousSecretExpiresAt: null,
      })
      .where(eq(applicationCredentials.id, credentialId))
      .returning();

    if (!updated) {
      throw new PaymentError(
        'RESOURCE_NOT_FOUND',
        'Revocation updated no row',
        { credentialId },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.revoke',
        resourceType: 'application_credential',
        resourceId: String(credentialId),
        beforeState: { revokedAt: existing.revokedAt },
        afterState: { mode: updated.mode, revokedAt: updated.revokedAt },
      },
      tx,
    );

    return updated;
  });
}

/**
 * The application's own fields: its name and its scopes.
 *
 * **`webhook_url` is not here any more.** It belongs to a credential — Sandbox
 * delivers to a staging endpoint and Production to a real one — so it is set
 * by `setCredentialWebhookUrl` below. Scopes stay here, shared: a scope
 * describes what the integration does, and it should not differ between the
 * credential somebody tested with and the one they went live with.
 */
export async function updateApplication(
  applicationId: number,
  patch: {
    name?: string;
    scopes?: ApplicationScope[];
  },
  actor: Actor,
  audit: AuditRecorder,
): Promise<Application> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for('update')
      .limit(1);

    if (!existing) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such application', {
        applicationId,
      });
    }

    const [updated] = await tx
      .update(applications)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.scopes !== undefined ? { scopes: patch.scopes } : {}),
      })
      .where(eq(applications.id, applicationId))
      .returning();

    if (!updated) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'Update touched no row', {
        applicationId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.update',
        resourceType: 'application',
        resourceId: String(applicationId),
        beforeState: { name: existing.name, scopes: existing.scopes },
        afterState: { name: updated.name, scopes: updated.scopes },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Where this credential's webhooks are delivered.
 *
 * **The door that matters most.** `return_url` sends a customer's browser
 * somewhere and is checked in the checkout route; this URL is fetched by our
 * own server, so an unchecked internal address here is an SSRF with our
 * network position behind it. `assertRegisteredHost` runs inside the same
 * transaction that writes the value, so a domain deleted mid-request cannot be
 * validated against and then vanish.
 *
 * Checked on every write rather than only when the value changes: "it was
 * already in the column" is not evidence it was ever validated.
 */
export async function setCredentialWebhookUrl(
  credentialId: number,
  webhookUrl: string | null,
  actor: Actor,
  audit: AuditRecorder,
): Promise<ApplicationCredential> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(applicationCredentials)
      .where(eq(applicationCredentials.id, credentialId))
      .for('update')
      .limit(1);

    if (!existing) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such credential', {
        credentialId,
      });
    }

    if (webhookUrl) {
      await assertRegisteredHost(credentialId, webhookUrl, 'webhook_url', tx);
    }

    const [updated] = await tx
      .update(applicationCredentials)
      .set({ webhookUrl })
      .where(eq(applicationCredentials.id, credentialId))
      .returning();

    if (!updated) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'Update touched no row', {
        credentialId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.set_webhook_url',
        resourceType: 'application_credential',
        resourceId: String(credentialId),
        beforeState: { webhookUrl: existing.webhookUrl },
        afterState: { webhookUrl: updated.webhookUrl },
      },
      tx,
    );

    return updated;
  });
}

/**
 * The product id this registration will use, whether it is being created or
 * merely named.
 *
 * The shape is enforced for a *new* id only. Existing rows were seeded before
 * this rule and are named by credentials already issued, so re-judging them
 * here would refuse a registration for a product that is working fine — the
 * foreign key is what proves an existing id is real.
 */
function resolveProductId(input: RegisterInput): string {
  if (!input.newProduct) return input.productId;

  const productId = normalizeProductId(input.productId);

  if (productId === null) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `"${input.productId}" is not a usable product id. Lowercase letters, digits and single hyphens, 2–32 characters.`,
      { field: 'newProductId', productId: input.productId },
    );
  }

  if (input.newProduct.name.trim() === '') {
    throw new PaymentError('VALIDATION_FAILED', 'A new product needs a name.', {
      field: 'newProductName',
    });
  }

  return productId;
}

/**
 * Turns admin-typed hostnames into the rows that will be stored, refusing the
 * whole set rather than silently dropping a bad one — an admin who mistypes
 * one of three domains must not discover it by a customer being refused.
 */
function normalizeDomains(
  domains: DomainInput[],
  mode: CredentialMode,
): { hostname: string; note: string | null }[] {
  const seen = new Map<string, string | null>();

  for (const domain of domains) {
    const raw = domain.hostname.trim();
    if (raw === '') continue;

    if (raw.startsWith('*')) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `Wildcard domains are not accepted. List each subdomain instead of "${raw}".`,
        { field: 'domains', hostname: raw },
      );
    }

    const hostname = normalizeHostnameInput(raw);

    if (hostname === null) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `"${raw}" is not a bare hostname. Enter it without a scheme, port or path.`,
        { field: 'domains', hostname: raw },
      );
    }

    /*
     * Refused at write time as well as at use time. `assertRegisteredHost`
     * would turn it down later anyway, but a row that can never be used is a
     * row an admin will spend an afternoon staring at — better to say so on
     * the form that is trying to create it.
     */
    if (isLoopbackHostname(hostname)) {
      assertLoopbackAllowed(hostname, mode, 'domains');
    }

    // Last note wins; the unique index would reject the duplicate row anyway.
    seen.set(hostname, domain.note?.trim() || null);
  }

  if (seen.size === 0) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'An application needs at least one registered domain. Without one it can be given neither a return URL nor a webhook address.',
      { field: 'domains' },
    );
  }

  return [...seen].map(([hostname, note]) => ({ hostname, note }));
}

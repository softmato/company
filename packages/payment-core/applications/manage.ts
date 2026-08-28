/**
 * Issue, rotate and revoke API credentials (docs/API.md §2).
 *
 * Every function here returns the plaintext secret exactly once. Nothing
 * stores it, nothing logs it, and the audit entries deliberately record only
 * the last four characters — a credential change that writes the credential
 * into the audit log has not been audited, it has been published.
 */
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';

import {
  applications,
  db,
  type Application,
  type ApplicationScope,
} from '@softmato/db';

import type { Actor, AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import { generateClientId, issueSecret } from './credentials';

/** docs/API.md §2 — "Rotation issues a new secret with a 24-hour overlap." */
const ROTATION_OVERLAP_MS = 24 * 60 * 60 * 1000;

export interface RegisterInput {
  productId: string;
  name: string;
  scopes: ApplicationScope[];
  webhookUrl?: string | null;
  isLive: boolean;
}

export interface IssuedCredential {
  application: Application;
  /** Displayed once. There is no second chance to read this. */
  secret: string;
}

export async function registerApplication(
  input: RegisterInput,
  actor: Actor,
  audit: AuditRecorder,
): Promise<IssuedCredential> {
  const clientId = generateClientId(input.productId, input.isLive);
  const { secret, secretHash, secretLast4 } = await issueSecret(clientId);

  const application = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(applications)
      .values({
        productId: input.productId,
        name: input.name,
        clientId,
        secretHash,
        secretLast4,
        scopes: input.scopes,
        webhookUrl: input.webhookUrl ?? null,
        // Signs outbound events. Never reaches a client bundle (RULES.md §6).
        webhookSecret: randomBytes(32).toString('base64url'),
        isLive: input.isLive,
      })
      .returning();

    if (!created) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Application insert returned no row',
        { clientId },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.register',
        resourceType: 'application',
        resourceId: String(created.id),
        afterState: {
          clientId,
          productId: input.productId,
          scopes: input.scopes,
          isLive: input.isLive,
          secretLast4,
        },
      },
      tx,
    );

    return created;
  });

  return { application, secret };
}

export interface RotationResult {
  application: Application;
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
  applicationId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<RotationResult> {
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

    if (existing.revokedAt) {
      throw new PaymentError(
        'INVALID_STATE',
        'A revoked application cannot rotate its secret; register a new one',
        { applicationId },
      );
    }

    const { secret, secretHash, secretLast4 } = await issueSecret(
      existing.clientId,
    );
    const now = new Date();
    const previousSecretExpiresAt = new Date(now.getTime() + ROTATION_OVERLAP_MS);

    const [updated] = await tx
      .update(applications)
      .set({
        secretHash,
        secretLast4,
        previousSecretHash: existing.secretHash,
        previousSecretLast4: existing.secretLast4,
        previousSecretExpiresAt,
        rotatedAt: now,
      })
      .where(eq(applications.id, applicationId))
      .returning();

    if (!updated) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'Rotation updated no row', {
        applicationId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.rotate_secret',
        resourceType: 'application',
        resourceId: String(applicationId),
        beforeState: { secretLast4: existing.secretLast4 },
        afterState: {
          secretLast4,
          previousSecretExpiresAt: previousSecretExpiresAt.toISOString(),
        },
      },
      tx,
    );

    return { application: updated, secret, previousSecretExpiresAt };
  });
}

/**
 * Revocation is immediate (docs/API.md §2) — including for the secret that was
 * mid-overlap, which is the only reason the overlap columns are cleared here
 * rather than left to expire on their own.
 */
export async function revokeApplication(
  applicationId: number,
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
        isActive: false,
        revokedAt: existing.revokedAt ?? new Date(),
        previousSecretHash: null,
        previousSecretLast4: null,
        previousSecretExpiresAt: null,
      })
      .where(eq(applications.id, applicationId))
      .returning();

    if (!updated) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'Revocation updated no row', {
        applicationId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.revoke',
        resourceType: 'application',
        resourceId: String(applicationId),
        beforeState: { isActive: existing.isActive },
        afterState: { isActive: false, revokedAt: updated.revokedAt },
      },
      tx,
    );

    return updated;
  });
}

/** Scopes and webhook URL are editable; credentials never are, only rotated. */
export async function updateApplication(
  applicationId: number,
  patch: { name?: string; scopes?: ApplicationScope[]; webhookUrl?: string | null },
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
        ...(patch.webhookUrl !== undefined
          ? { webhookUrl: patch.webhookUrl }
          : {}),
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
        beforeState: {
          name: existing.name,
          scopes: existing.scopes,
          webhookUrl: existing.webhookUrl,
        },
        afterState: {
          name: updated.name,
          scopes: updated.scopes,
          webhookUrl: updated.webhookUrl,
        },
      },
      tx,
    );

    return updated;
  });
}

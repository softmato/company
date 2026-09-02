/**
 * Reading and replacing the secret that signs outbound webhooks.
 *
 * ## Why this is not the client secret
 *
 * They are different credentials and neither works in the other's place. The
 * client secret authenticates the product *to us* and is argon2id-hashed, so
 * it genuinely cannot be read back — a lost one is rotated, not recovered.
 * The webhook secret authenticates *us to the product*: the consumer needs the
 * same bytes we sign with, so it is stored in plaintext and can be shown
 * again. That asymmetry is not an oversight, and it is the thing most likely
 * to be misunderstood by whoever is wiring up the integration.
 *
 * ## Why revealing is audited
 *
 * A read that hands over a live signing key is an event, not a lookup. If this
 * key later turns up somewhere it should not be, the question asked is who
 * last had it — and only an audit row can answer that.
 */
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { applications, db } from '@softmato/db';

import type { Actor, AuditRecorder } from '../audit';
import { PaymentError } from '../errors';

/** 32 bytes, the same width the delivery signer expects. */
function newWebhookSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Returns the current signing secret, recording that it was read.
 *
 * Deliberately not part of any list query: `listApplications` reports only
 * whether a secret exists. Reading the value is a separate, audited act.
 */
export async function revealWebhookSecret(
  applicationId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        webhookSecret: applications.webhookSecret,
        revokedAt: applications.revokedAt,
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!row) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such application', {
        applicationId,
      });
    }

    if (row.revokedAt) {
      throw new PaymentError(
        'INVALID_STATE',
        'This application is revoked; its webhook secret signs nothing',
        { applicationId },
      );
    }

    if (!row.webhookSecret) {
      throw new PaymentError(
        'INVALID_STATE',
        'This application has no webhook secret',
        { applicationId },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.webhook_secret_reveal',
        resourceType: 'application',
        resourceId: String(applicationId),
      },
      tx,
    );

    return row.webhookSecret;
  });
}

/**
 * Replaces the signing secret. There is no overlap here, unlike a client
 * secret rotation: signatures are verified by the consumer, so two valid
 * secrets would mean a consumer that accepts a signature from a key we meant
 * to retire. The consumer redeploys with the new value; deliveries in flight
 * against the old one fail and are retried by the delivery job.
 */
export async function rotateWebhookSecret(
  applicationId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ revokedAt: applications.revokedAt })
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
        'A revoked application cannot rotate its webhook secret',
        { applicationId },
      );
    }

    const webhookSecret = newWebhookSecret();

    await tx
      .update(applications)
      .set({ webhookSecret })
      .where(eq(applications.id, applicationId));

    // The value never enters the audit row — only that it changed, and when.
    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.webhook_secret_rotate',
        resourceType: 'application',
        resourceId: String(applicationId),
      },
      tx,
    );

    return webhookSecret;
  });
}

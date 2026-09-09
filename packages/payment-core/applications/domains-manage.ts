/**
 * Adding and removing registered domains — the admin half of
 * `./domains.ts`, kept separate so the read path a payment depends on does not
 * import the write path it never uses.
 *
 * Every change here writes an audit row. An allowlist whose edits are not
 * recorded tells you what is allowed today and nothing about who allowed it,
 * which is exactly the question asked after an incident.
 */
import { asc, eq } from 'drizzle-orm';

import {
  applicationCredentials,
  applicationDomains,
  db,
  type ApplicationDomain,
} from '@softmato/db';

import type { Actor, AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import { normalizeHostnameInput } from './domains';
import { assertLoopbackAllowed, isLoopbackHostname } from './loopback';

export async function listDomains(
  credentialId: number,
): Promise<ApplicationDomain[]> {
  return db
    .select()
    .from(applicationDomains)
    .where(eq(applicationDomains.credentialId, credentialId))
    .orderBy(asc(applicationDomains.hostname));
}

export interface AddDomainInput {
  credentialId: number;
  /** `questioncall.com` — bare host. A scheme, port or path is refused. */
  hostname: string;
  note?: string | null;
}

/**
 * Wildcards are refused explicitly rather than falling through to the shape
 * check, because `*.questioncall.com` is a thing an admin will reasonably try
 * and deserves an answer that says why it is not allowed.
 */
export async function addDomain(
  input: AddDomainInput,
  actor: Actor,
  audit: AuditRecorder,
): Promise<ApplicationDomain> {
  const raw = input.hostname.trim();

  if (raw.startsWith('*')) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Wildcard domains are not accepted. List each subdomain that needs access — a wildcard becomes an allow-anything the day a subdomain is lost.',
      { hostname: raw },
    );
  }

  const hostname = normalizeHostnameInput(raw);

  if (hostname === null) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `"${raw}" is not a bare hostname. Enter it without a scheme, port or path — "questioncall.com", not "https://questioncall.com/pay".`,
      { hostname: raw },
    );
  }

  return db.transaction(async (tx) => {
    /*
     * A loopback name is refused here as well as at use time, and the mode
     * comes from the row rather than from the caller — this function is
     * reachable by anyone who can post to the domain form.
     *
     * Judged as a `redirect`, which is the weaker of the two rules: one row
     * serves both directions, and refusing to *store* it would mean a Sandbox
     * integrator on localhost could not register the address their browser is
     * sent back to. The `fetch` rule still bites where it matters —
     * `setCredentialWebhookUrl` re-checks this hostname as a fetch target and
     * refuses it off a non-local deployment.
     */
    if (isLoopbackHostname(hostname)) {
      const [credential] = await tx
        .select({ mode: applicationCredentials.mode })
        .from(applicationCredentials)
        .where(eq(applicationCredentials.id, input.credentialId))
        .limit(1);

      if (!credential) {
        throw new PaymentError('RESOURCE_NOT_FOUND', 'No such credential', {
          credentialId: input.credentialId,
        });
      }

      assertLoopbackAllowed(hostname, credential.mode, 'hostname', 'redirect');
    }

    const [created] = await tx
      .insert(applicationDomains)
      .values({
        credentialId: input.credentialId,
        hostname,
        note: input.note?.trim() || null,
        createdBy: actor.id,
      })
      .onConflictDoNothing({
        target: [applicationDomains.credentialId, applicationDomains.hostname],
      })
      .returning();

    if (!created) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `"${hostname}" is already registered for this credential.`,
        { hostname },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.domain_add',
        resourceType: 'application_credential',
        resourceId: String(input.credentialId),
        afterState: { hostname, note: created.note },
      },
      tx,
    );

    return created;
  });
}

/**
 * Removal takes effect immediately, including for sessions already created —
 * `isRegisteredHost` is re-checked when the return link is drawn, not only
 * when the session was made.
 */
export async function removeDomain(
  domainId: number,
  actor: Actor,
  audit: AuditRecorder,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(applicationDomains)
      .where(eq(applicationDomains.id, domainId))
      .returning();

    if (!deleted) {
      throw new PaymentError('RESOURCE_NOT_FOUND', 'No such domain', {
        domainId,
      });
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.domain_remove',
        resourceType: 'application_credential',
        resourceId: String(deleted.credentialId),
        beforeState: { hostname: deleted.hostname, note: deleted.note },
      },
      tx,
    );
  });
}

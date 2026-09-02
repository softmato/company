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

import { applicationDomains, db, type ApplicationDomain } from '@softmato/db';

import type { Actor, AuditRecorder } from '../audit';
import { PaymentError } from '../errors';
import { normalizeHostnameInput } from './domains';

export async function listDomains(
  applicationId: number,
): Promise<ApplicationDomain[]> {
  return db
    .select()
    .from(applicationDomains)
    .where(eq(applicationDomains.applicationId, applicationId))
    .orderBy(asc(applicationDomains.hostname));
}

export interface AddDomainInput {
  applicationId: number;
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
    const [created] = await tx
      .insert(applicationDomains)
      .values({
        applicationId: input.applicationId,
        hostname,
        note: input.note?.trim() || null,
        createdBy: actor.id,
      })
      .onConflictDoNothing({
        target: [applicationDomains.applicationId, applicationDomains.hostname],
      })
      .returning();

    if (!created) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `"${hostname}" is already registered for this application.`,
        { hostname },
      );
    }

    await audit(
      {
        actorType: actor.type,
        actorId: actor.id,
        action: 'application.domain_add',
        resourceType: 'application',
        resourceId: String(input.applicationId),
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
        resourceType: 'application',
        resourceId: String(deleted.applicationId),
        beforeState: { hostname: deleted.hostname, note: deleted.note },
      },
      tx,
    );
  });
}

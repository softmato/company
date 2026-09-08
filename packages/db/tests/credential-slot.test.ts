/**
 * Revoking a credential frees its mode's slot. Revoking is not terminal.
 *
 * The founder found this by using the screen: they revoked the Production
 * credential on an application, and the page then offered nothing at all —
 * no button, because the panel only shows one for a mode that does not exist,
 * and no API either, because `addCredential` refused with "this application
 * already has a Production credential". The only routes back were registering
 * a whole new application or an `UPDATE` by hand.
 *
 * The cause was `UNIQUE (application_id, mode)`, which counts revoked rows.
 * Migration 0009 makes it partial — `WHERE revoked_at IS NULL` — so the
 * guarantee that matters survives (at most one *live* credential per mode)
 * while dead rows stop occupying the slot.
 *
 * **The dead rows have to stay.** `transactions.credential_id` and
 * `webhook_deliveries.credential_id` reference them, and they are the record
 * of which key was live when a payment was taken. So "free the slot" cannot
 * be implemented as a delete, and this file asserts the row is still there
 * afterwards rather than only that the insert succeeded.
 *
 * These are constraint tests, so they go at the database rather than through
 * `addCredential`: the application-level check and the index have to agree,
 * and a test that only exercises the former would pass against a database
 * that still refuses the insert.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, isNull, like } from 'drizzle-orm';

import { db } from '../client';
import {
  applicationCredentials,
  applications,
  type CredentialMode,
} from '../schema/applications';

const PRODUCT = 'hostelhub';
const marker = `slottest-${Date.now()}`;
const NAME = `Slot fixture ${marker}`;

let applicationId: number;

beforeAll(async () => {
  await sweep();

  const [app] = await db
    .insert(applications)
    .values({
      productId: PRODUCT,
      name: NAME,
      scopes: ['payment:read' as const],
    })
    .returning({ id: applications.id });

  applicationId = app!.id;
});

afterAll(sweep);

async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.name, 'Slot fixture slottest-%'));

  if (stale.length === 0) return;

  await db.delete(applications).where(
    inArray(
      applications.id,
      stale.map((row) => row.id),
    ),
  );
}

let serial = 0;

/**
 * `client_id_matches_mode` is a live CHECK, so the prefix has to agree with
 * the mode — a fixture that ignores it fails for the wrong reason.
 */
function credential(mode: CredentialMode) {
  serial += 1;
  const clientId = `app_${mode}_${PRODUCT}_${marker}x${serial}`;

  return {
    applicationId,
    mode,
    clientId,
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'aaaa',
    webhookSecret: `whsec_${clientId}`,
  };
}

describe('one live credential per mode, and revocation is survivable', () => {
  it('refuses a second live credential for the same mode', async () => {
    await db.insert(applicationCredentials).values(credential('live'));

    await expect(
      db.insert(applicationCredentials).values(credential('live')),
    ).rejects.toThrow();
  });

  it('accepts a replacement once the first is revoked, and keeps the old row', async () => {
    const before = await db
      .update(applicationCredentials)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          eq(applicationCredentials.mode, 'live'),
          isNull(applicationCredentials.revokedAt),
        ),
      )
      .returning({ id: applicationCredentials.id });

    expect(before).toHaveLength(1);

    // The insert that used to be impossible.
    await db.insert(applicationCredentials).values(credential('live'));

    const rows = await db
      .select({
        id: applicationCredentials.id,
        revokedAt: applicationCredentials.revokedAt,
      })
      .from(applicationCredentials)
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          eq(applicationCredentials.mode, 'live'),
        ),
      );

    // Two rows for one mode: one dead, one live. Not a replacement in place.
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1);
    expect(rows.map((row) => row.id)).toContain(before[0]!.id);
  });

  it('still refuses a second live one after the replacement', async () => {
    await expect(
      db.insert(applicationCredentials).values(credential('live')),
    ).rejects.toThrow();
  });

  it('lets several revoked credentials pile up on one mode', async () => {
    await db
      .update(applicationCredentials)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          eq(applicationCredentials.mode, 'live'),
          isNull(applicationCredentials.revokedAt),
        ),
      );

    // Two dead already; a third is issued and revoked, and nothing objects.
    await db.insert(applicationCredentials).values(credential('live'));
    await db
      .update(applicationCredentials)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          isNull(applicationCredentials.revokedAt),
        ),
      );

    await db.insert(applicationCredentials).values(credential('live'));

    const rows = await db
      .select({ revokedAt: applicationCredentials.revokedAt })
      .from(applicationCredentials)
      .where(
        and(
          eq(applicationCredentials.applicationId, applicationId),
          eq(applicationCredentials.mode, 'live'),
        ),
      );

    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1);
  });

  it('keeps the modes independent', async () => {
    // A Sandbox credential is unaffected by anything above.
    await db.insert(applicationCredentials).values(credential('test'));

    await expect(
      db.insert(applicationCredentials).values(credential('test')),
    ).rejects.toThrow();
  });
});

/**
 * The rotation overlap, and the warning nobody was getting.
 *
 * `authenticateApplication` has always known whether a caller presented the
 * superseded secret — `usedPreviousSecret` — and for as long as rotation has
 * existed, nothing read it. So during the 24 hours an integrator has to
 * redeploy, they were told nothing at all, and at hour 24 their integration
 * simply started returning `401`. Item 11 is that warning.
 *
 * **The window is set by hand here rather than waited out**, exactly as the
 * plan asks: the tests write `previous_secret_expires_at` directly, which is
 * the same column `rotateSecret` writes and the same one `matchSecret` reads.
 * Nothing is mocked — the boundary under test is "does an expired overlap stop
 * authenticating", and a fake clock would move that boundary somewhere the
 * production code will never be.
 *
 * Three things are asserted, and the third is the one that matters:
 *
 *   1. The old secret authenticates while the window is open, and the result
 *      carries the expiry.
 *   2. The new secret authenticates and carries nothing — a warning that is
 *      always present is a warning nobody reads.
 *   3. An expired window does not authenticate at all. The overlap has to
 *      actually close; a signal that the secret is expiring is worthless if
 *      the secret never expires.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

import { db } from '../client';
import { applicationCredentials, applications } from '../schema/applications';
import { authenticateApplication, issueSecret } from '../../payment-core/index';

const PRODUCT = 'hostelhub';
const marker = `overlaptest-${Date.now()}`;
const NAME = `Overlap fixture ${marker}`;

/*
 * The handle has to satisfy `clientIdFromSecret`'s
 * `(live|test)_[a-z0-9-]+_[a-z0-9]+` — the last segment takes no hyphen — so
 * the timestamp goes in without the marker's dash. A client id that fails that
 * regex is rejected before a single query runs, which fails this suite for a
 * reason that has nothing to do with the overlap.
 */
const CLIENT_ID = `app_test_${PRODUCT}_ovl${Date.now()}`;

let credentialId: number;
let currentSecret: string;
let previousSecret: string;

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

  const current = await issueSecret(CLIENT_ID);
  const previous = await issueSecret(CLIENT_ID);

  currentSecret = current.secret;
  previousSecret = previous.secret;

  const [credential] = await db
    .insert(applicationCredentials)
    .values({
      applicationId: app!.id,
      mode: 'test',
      clientId: CLIENT_ID,
      secretHash: current.secretHash,
      secretLast4: current.secretLast4,
      previousSecretHash: previous.secretHash,
      previousSecretLast4: previous.secretLast4,
      // Open, for now. Individual cases move it.
      previousSecretExpiresAt: new Date(Date.now() + 60_000),
    })
    .returning({ id: applicationCredentials.id });

  credentialId = credential!.id;
});

afterAll(sweep);

async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.name, 'Overlap fixture overlaptest-%'));

  if (stale.length === 0) return;

  await db.delete(applications).where(
    inArray(
      applications.id,
      stale.map((row) => row.id),
    ),
  );
}

/** The shortened overlap the plan asks for: a column write, not a wait. */
async function setOverlap(expiresAt: Date | null) {
  await db
    .update(applicationCredentials)
    .set({ previousSecretExpiresAt: expiresAt })
    .where(eq(applicationCredentials.id, credentialId));
}

describe('the superseded secret, while its window is open', () => {
  it('authenticates, and says when it stops', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    await setOverlap(expiresAt);

    const result = await authenticateApplication(`Bearer ${previousSecret}`);

    expect(result.usedPreviousSecret).toBe(true);
    expect(result.previousSecretExpiresAt?.toISOString()).toBe(
      expiresAt.toISOString(),
    );
  });

  it('records that it was used, so the panel can say whether they redeployed', async () => {
    await setOverlap(new Date(Date.now() + 60_000));
    await db
      .update(applicationCredentials)
      .set({ previousSecretLastUsedAt: null })
      .where(eq(applicationCredentials.id, credentialId));

    await authenticateApplication(`Bearer ${previousSecret}`);

    /*
     * The write is deliberately not awaited inside `authenticateApplication` —
     * it is bookkeeping and must never fail a payment — so it is polled for
     * here rather than assumed to have landed by the time the call returns.
     */
    let lastUsed: Date | null = null;

    for (let attempt = 0; attempt < 20 && lastUsed === null; attempt += 1) {
      const [row] = await db
        .select({ at: applicationCredentials.previousSecretLastUsedAt })
        .from(applicationCredentials)
        .where(eq(applicationCredentials.id, credentialId))
        .limit(1);

      lastUsed = row?.at ?? null;

      if (lastUsed === null) await new Promise((r) => setTimeout(r, 100));
    }

    expect(lastUsed).not.toBeNull();
  });

  it('says nothing when the current secret is used', async () => {
    await setOverlap(new Date(Date.now() + 60_000));

    const result = await authenticateApplication(`Bearer ${currentSecret}`);

    expect(result.usedPreviousSecret).toBe(false);
    expect(result.previousSecretExpiresAt).toBeNull();
  });
});

describe('once the window has passed', () => {
  it('refuses the superseded secret', async () => {
    await setOverlap(new Date(Date.now() - 1000));

    await expect(
      authenticateApplication(`Bearer ${previousSecret}`),
    ).rejects.toThrow();
  });

  it('still accepts the current one', async () => {
    await setOverlap(new Date(Date.now() - 1000));

    const result = await authenticateApplication(`Bearer ${currentSecret}`);

    expect(result.clientId).toBe(CLIENT_ID);
    expect(result.previousSecretExpiresAt).toBeNull();
  });
});

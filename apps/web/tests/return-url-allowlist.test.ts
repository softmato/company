/**
 * `return_url` is checked against the **credential's** allowlist, against real
 * Postgres.
 *
 * ## The bug this pins
 *
 * `assertRegisteredHost` and `isRegisteredHost` both take a **credentialId**
 * and filter `application_domains.credential_id`. Two call sites passed an
 * **application** id instead:
 *
 *   * `POST /v1/checkout` — `assertRegisteredHost(application.id, …)`, where
 *     `AuthenticatedApplication` carries both `id` and `credentialId`.
 *   * `lib/checkout/return-link.ts` — `isRegisteredHost(row.applicationId, …)`.
 *
 * Both were written when domains hung off the application, and neither was
 * updated when the credential split moved them. Nothing failed loudly, because
 * `applications.id` and `application_credentials.id` are independent identity
 * sequences of the same type: the comparison always compiles, always runs, and
 * is right only when the two numbers coincide. In a fresh database they
 * coincide constantly — the first application and the first credential are
 * both `1` — which is exactly why this survived.
 *
 * ## Why it is tested here rather than in `packages/db`
 *
 * The helper was never wrong; the callers were. A test that exercises
 * `assertRegisteredHost` alone would have passed throughout. So this asserts
 * the thing that actually broke — that an application id and a credential id
 * are **not interchangeable** at these call sites — and then drives
 * `returnLinkFor` end to end, which is the call site a unit test can reach
 * without minting a bearer token.
 *
 * `packages/db` cannot host it either way: it does not depend on
 * `@softmato/payment-core`, and a dev dependency the other way round would
 * close a cycle.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

import {
  applicationCredentials,
  applicationDomains,
  applications,
  customers,
  db,
  invoices,
  paymentSessions,
  type CredentialMode,
} from '@softmato/db';
import {
  assertRegisteredHost,
  generateSessionId,
  isRegisteredHost,
} from '@softmato/payment-core';

import { returnLinkFor } from '@/lib/checkout/return-link';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';
const marker = `returntest-${Date.now()}`;
const NAME = `Return fixture ${marker}`;

/** Isolated from any real fiscal year, so a run cannot collide with the books. */
const FY = 'RTN/00';

/** One application, two credentials, one registered host each. */
let applicationId: number;
let sandbox: number;
let production: number;

let customerId: number;
let invoiceId: number;

const SANDBOX_HOST = 'staging.questioncall.com';
const PRODUCTION_HOST = 'questioncall.com';

beforeAll(async () => {
  await sweep();

  const [app] = await db
    .insert(applications)
    .values({
      productId: PRODUCT,
      name: NAME,
      scopes: ['payment:create' as const, 'payment:read' as const],
    })
    .returning({ id: applications.id });

  applicationId = app!.id;

  const made = await db
    .insert(applicationCredentials)
    .values([credential('test'), credential('live')])
    .returning({
      id: applicationCredentials.id,
      mode: applicationCredentials.mode,
    });

  sandbox = made.find((c) => c.mode === 'test')!.id;
  production = made.find((c) => c.mode === 'live')!.id;

  /*
   * A different host on each credential. This is the arrangement the split
   * exists for — staging on Sandbox, the real site on Production — and it is
   * also what makes the two ids distinguishable: a check that looks at the
   * wrong one gets a different answer rather than the same one by luck.
   */
  await db.insert(applicationDomains).values([
    { credentialId: sandbox, hostname: SANDBOX_HOST },
    { credentialId: production, hostname: PRODUCTION_HOST },
  ]);

  const [customer] = await db
    .insert(customers)
    .values({
      productId: PRODUCT,
      name: 'Return fixture',
      externalRef: `return-fixture-${marker}`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  const unique = Date.now();

  const [invoice] = await db
    .insert(invoices)
    .values({
      mode: 'test',
      invoiceNo: `INV-${FY}-${unique}`,
      fiscalYear: FY,
      sequenceNo: unique,
      productId: PRODUCT,
      customerId,
      status: 'issued',
      subtotalMinor: 500_00n,
      totalMinor: 500_00n,
    })
    .returning({ id: invoices.id });

  invoiceId = invoice!.id;
});

afterAll(sweep);

async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.name, 'Return fixture returntest-%'));

  if (stale.length > 0) {
    const ids = stale.map((row) => row.id);

    // Sessions reference the application, so they go before it does.
    await db
      .delete(paymentSessions)
      .where(inArray(paymentSessions.applicationId, ids));

    // Credentials and domains cascade from the application.
    await db.delete(applications).where(inArray(applications.id, ids));
  }

  await db
    .delete(invoices)
    .where(like(invoices.invoiceNo, `INV-${FY}-%`))
    .catch(() => undefined);

  await db
    .delete(customers)
    .where(like(customers.externalRef, 'return-fixture-returntest-%'));
}

function credential(mode: CredentialMode) {
  const clientId = `app_${mode}_${PRODUCT}_${marker}`;

  return {
    applicationId,
    mode,
    clientId,
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'aaaa',
    webhookSecret: `whsec_${clientId}`,
  };
}

/**
 * A session as `POST /v1/checkout` would have written it, with the return URL
 * already stored. `credentialId` is the field under test.
 */
async function session(options: {
  credentialId: number | null;
  returnUrl: string | null;
}): Promise<string> {
  const id = generateSessionId('test');

  await db.insert(paymentSessions).values({
    id,
    mode: 'test',
    invoiceId,
    applicationId,
    credentialId: options.credentialId,
    productId: PRODUCT,
    customerId,
    amountMinor: 500_00n,
    allowedProviders: [PROVIDER],
    returnUrl: options.returnUrl,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return id;
}

describe('the allowlist is per credential', () => {
  it('accepts a host on the credential that registered it', async () => {
    await expect(
      assertRegisteredHost(
        sandbox,
        `https://${SANDBOX_HOST}/paid`,
        'return_url',
      ),
    ).resolves.toBe(SANDBOX_HOST);
  });

  /**
   * The confusion the split exists to prevent: a Sandbox credential must not
   * be able to send a customer to the production site.
   */
  it('refuses a host registered against the other credential', async () => {
    await expect(
      assertRegisteredHost(
        sandbox,
        `https://${PRODUCTION_HOST}/paid`,
        'return_url',
      ),
    ).rejects.toThrow(/not a registered domain/);

    await expect(
      assertRegisteredHost(
        production,
        `https://${SANDBOX_HOST}/paid`,
        'return_url',
      ),
    ).rejects.toThrow(/not a registered domain/);
  });

  /**
   * **The regression.** An application id where a credential id belongs is not
   * a near miss that happens to work — it addresses a different table's
   * sequence. Both call sites did this for as long as domains have been per
   * credential.
   */
  it('does not treat an application id as a credential id', async () => {
    expect(applicationId).not.toBe(sandbox);
    expect(applicationId).not.toBe(production);

    await expect(
      assertRegisteredHost(
        applicationId,
        `https://${SANDBOX_HOST}/paid`,
        'return_url',
      ),
    ).rejects.toThrow(/not a registered domain/);

    await expect(
      isRegisteredHost(applicationId, `https://${PRODUCTION_HOST}/paid`),
    ).resolves.toBe(false);
  });
});

describe('returnLinkFor', () => {
  it('draws the link when the session credential registered the host', async () => {
    const id = await session({
      credentialId: sandbox,
      returnUrl: `https://${SANDBOX_HOST}/thanks`,
    });

    await expect(returnLinkFor(id)).resolves.toEqual({
      href: `https://${SANDBOX_HOST}/thanks`,
      applicationName: NAME,
    });
  });

  /**
   * The same URL, the same application, the other credential. Before the fix
   * this asked the application id and got one answer for both — so the button
   * either appeared for both or for neither, and which one depended on whether
   * an unrelated sequence happened to line up.
   */
  it('refuses a host that belongs to the other credential', async () => {
    const id = await session({
      credentialId: sandbox,
      returnUrl: `https://${PRODUCTION_HOST}/thanks`,
    });

    await expect(returnLinkFor(id)).resolves.toBeNull();
  });

  /** A session opened from the admin panel: no credential, no allowlist. */
  it('draws nothing for a session with no credential behind it', async () => {
    const id = await session({
      credentialId: null,
      returnUrl: `https://${SANDBOX_HOST}/thanks`,
    });

    await expect(returnLinkFor(id)).resolves.toBeNull();
  });

  it('draws nothing when there is no return URL, which is the usual case', async () => {
    const id = await session({ credentialId: sandbox, returnUrl: null });

    await expect(returnLinkFor(id)).resolves.toBeNull();
  });

  /**
   * Removing a domain must stop every session that already named it, not only
   * the ones created afterwards — otherwise revoking a compromised host would
   * leave the sessions it was stolen for still pointing at it.
   */
  it('stops drawing a link once the domain is removed', async () => {
    const id = await session({
      credentialId: production,
      returnUrl: `https://${PRODUCTION_HOST}/thanks`,
    });

    await expect(returnLinkFor(id)).resolves.not.toBeNull();

    await db
      .delete(applicationDomains)
      .where(eq(applicationDomains.credentialId, production));

    await expect(returnLinkFor(id)).resolves.toBeNull();
  });
});

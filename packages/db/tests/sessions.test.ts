/**
 * Session transitions against real Postgres.
 *
 * The pure state machine is tested in `packages/payment-core/tests`. What is
 * tested here is the part a table of legal moves cannot promise on its own:
 * that the move is actually *written*, that a concurrent writer loses rather
 * than overwrites, and that a session past its deadline is refused — Phase 3
 * acceptance 7, "an expired session cannot be paid".
 *
 * Expiry is the one worth stating plainly. `expires_at` passing does not change
 * a row: a session created at 10:00 still reads `created` at 11:00. Anything
 * trusting the status column alone would let a customer pay into it, so the
 * tests below check the row after the read, not just the answer.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from '../client';
import { customers } from '../schema/customers';
import { invoices } from '../schema/invoices';
import { paymentSessions } from '../schema/payments';
import {
  expireIfDue,
  loadPayableSession,
  loadSession,
  selectProvider,
  transitionSession,
  generateSessionId,
} from '../../payment-core/index';
import { PaymentError } from '../../payment-core/errors';

const PRODUCT = 'hostelhub';
/** Any seeded provider row; these tests are about session state, not payments. */
const PROVIDER = 'fonepay';

let customerId: number;
let invoiceId: number;

/** Isolated from any real fiscal year, so a run cannot collide with the books. */
const FY = 'SESS/00';

beforeAll(async () => {
  const [customer] = await db
    .insert(customers)
    .values({
      productId: PRODUCT,
      name: 'Session fixture',
      externalRef: `sess-fixture-${Date.now()}`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  const unique = Date.now();

  const [invoice] = await db
    .insert(invoices)
    .values({
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

/**
 * A session row written directly, so each test controls status and deadline.
 *
 * `created_at` is set explicitly rather than defaulted, because the
 * `session_expiry_future` check requires `expires_at > created_at` — the
 * database will not accept a session that was born already expired, which is
 * correct and means an expired fixture has to be *aged* instead. It is written
 * as a session created an hour before its own deadline.
 */
async function makeSession(options: {
  status?: 'created' | 'provider_selected' | 'pending' | 'succeeded';
  expiresInMs?: number;
  allowedProviders?: string[];
}) {
  const { status = 'created', expiresInMs = 30 * 60 * 1000 } = options;
  const expiresAt = new Date(Date.now() + expiresInMs);

  const [session] = await db
    .insert(paymentSessions)
    .values({
      id: generateSessionId(false),
      invoiceId,
      productId: PRODUCT,
      customerId,
      amountMinor: 500_00n,
      status,
      allowedProviders: options.allowedProviders ?? [PROVIDER],
      expiresAt,
      createdAt: new Date(expiresAt.getTime() - 60 * 60 * 1000),
    })
    .returning();

  return session!;
}

async function statusOf(id: string): Promise<string> {
  const [row] = await db
    .select({ status: paymentSessions.status })
    .from(paymentSessions)
    .where(eq(paymentSessions.id, id))
    .limit(1);

  return row!.status;
}

describe('transitionSession', () => {
  it('writes a legal move', async () => {
    const session = await makeSession({});

    const moved = await transitionSession(db, session, 'provider_selected', {
      selectedProvider: PROVIDER,
    });

    expect(moved.status).toBe('provider_selected');
    expect(moved.selectedProvider).toBe(PROVIDER);
    expect(await statusOf(session.id)).toBe('provider_selected');
  });

  it('refuses an illegal move and leaves the row alone', async () => {
    const session = await makeSession({ status: 'succeeded' });

    await expect(
      transitionSession(db, session, 'pending'),
    ).rejects.toBeInstanceOf(PaymentError);

    expect(await statusOf(session.id)).toBe('succeeded');
  });

  /**
   * The compare-and-set. Both callers hold a session object that says
   * `created`; only one may win. Without `WHERE status = <from>` the second
   * would happily overwrite the first — which on a real path is a callback
   * landing while the customer clicks, and a paid session going backwards.
   */
  it('refuses a write when the status moved underneath it', async () => {
    const session = await makeSession({});
    const stale = { ...session };

    await transitionSession(db, session, 'cancelled');

    await expect(
      transitionSession(db, stale, 'provider_selected'),
    ).rejects.toBeInstanceOf(PaymentError);

    expect(await statusOf(session.id)).toBe('cancelled');
  });
});

describe('expiry', () => {
  it('writes expired when the deadline has passed', async () => {
    const session = await makeSession({ expiresInMs: -60_000 });

    const settled = await expireIfDue(db, session);

    expect(settled.status).toBe('expired');
    // The row, not just the return value — a caller that re-reads must agree.
    expect(await statusOf(session.id)).toBe('expired');
  });

  it('leaves a live session alone', async () => {
    const session = await makeSession({});

    expect((await expireIfDue(db, session)).status).toBe('created');
    expect(await statusOf(session.id)).toBe('created');
  });

  /**
   * Money arrived before the deadline. Expiring it afterwards would be
   * rewriting history over a clock.
   */
  it('never expires a session that already succeeded', async () => {
    const session = await makeSession({
      status: 'succeeded',
      expiresInMs: -60_000,
    });

    expect((await expireIfDue(db, session)).status).toBe('succeeded');
    expect(await statusOf(session.id)).toBe('succeeded');
  });

  // Phase 3 acceptance 7.
  it('refuses to hand out an expired session as payable', async () => {
    const session = await makeSession({ expiresInMs: -60_000 });

    await expect(loadPayableSession(db, session.id)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });

    // And the read settled it on the way past, rather than only complaining.
    expect(await statusOf(session.id)).toBe('expired');
  });

  it('refuses a session that is already paid', async () => {
    const session = await makeSession({ status: 'succeeded' });

    await expect(loadPayableSession(db, session.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });
});

describe('loadSession', () => {
  it('rejects a malformed id without querying', async () => {
    await expect(loadSession(db, 'not-a-session')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('reports a well-formed id that does not exist as not found', async () => {
    await expect(
      loadSession(db, generateSessionId(false)),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});

describe('selectProvider', () => {
  it('records the customer’s choice', async () => {
    const session = await makeSession({});

    const chosen = await selectProvider(db, session.id, PROVIDER);

    expect(chosen.status).toBe('provider_selected');
    expect(chosen.selectedProvider).toBe(PROVIDER);
  });

  /**
   * Held to the list written at creation, not to the providers table as it
   * stands now. A provider deactivated mid-session must not change what the
   * page in front of a human is offering.
   */
  it('refuses a provider that was not offered for this session', async () => {
    const session = await makeSession({ allowedProviders: ['esewa'] });

    await expect(
      selectProvider(db, session.id, PROVIDER),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });

    expect(await statusOf(session.id)).toBe('created');
  });

  it('refuses a provider that does not exist', async () => {
    const session = await makeSession({});

    await expect(
      selectProvider(db, session.id, 'paypal'),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  // A double-click is not an illegal transition.
  it('is idempotent when the same provider is chosen twice', async () => {
    const session = await makeSession({});

    await selectProvider(db, session.id, PROVIDER);
    const again = await selectProvider(db, session.id, PROVIDER);

    expect(again.selectedProvider).toBe(PROVIDER);
    expect(again.status).toBe('provider_selected');
  });

  it('refuses to select a provider on an expired session', async () => {
    const session = await makeSession({ expiresInMs: -60_000 });

    await expect(
      selectProvider(db, session.id, PROVIDER),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });
});

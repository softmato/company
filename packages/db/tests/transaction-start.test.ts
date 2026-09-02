/**
 * Provider selection creating a payment attempt, against real Postgres.
 *
 * The behaviour worth the setup cost is the one about refreshing. Every
 * `initiate()` books a fresh intent at the gateway and returns a new reference,
 * so a customer who reloads the checkout page and receives a second one leaves
 * two live intents against a single invoice — and the one they actually pay is
 * then not the one we are polling. The tests below pin the reuse that prevents
 * it.
 *
 * Everything is dated inside an isolated 1980 fiscal year so that `TXN-…`
 * numbers allocated here never touch the real sequence.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { db } from '../client';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { paymentSessions, transactions } from '../schema/payments';
import {
  generateSessionId,
  registerProvider,
  resetProviderRegistry,
  startPayment,
} from '../../payment-core/index';
import type { AuditRecord } from '../../payment-core/audit';
import type { ProviderAdapter } from '../../payment-core/providers/types';

const PRODUCT = 'hostelhub';
/** The primary gateway. No adapter exists yet, so these tests supply a stub. */
const PROVIDER = 'fonepay';

/** Isolated from any real BS year, so allocation cannot touch the real books. */
const FY = 'TXN/00';
/**
 * An instant inside that year, and long before any session deadline.
 *
 * 1975 because the other suites' fixture periods are already parked in 1980
 * (`NUM/00`), 1990 and 1995 (`TEST/00`). Nothing cleans these up — ledger
 * history cannot be deleted — so the windows accumulate, and
 * `resolveFiscalPeriod()` fails closed on an overlap rather than picking one.
 * A new suite needing a fiscal year has to claim an unused window too.
 */
const NOW = new Date('1975-06-01T00:00:00Z');
const PERIOD_STARTS = new Date('1975-01-01T00:00:00Z');
const PERIOD_ENDS = new Date('1976-01-01T00:00:00Z');

const REDIRECT = 'https://gateway.example/pay';

/**
 * A stand-in for the gateway adapter Phase 9 will write. It only has to do what
 * every adapter does — book an intent and hand back a reference — because what
 * is under test is the orchestration around it, not any provider's protocol.
 * Each call returns a distinct reference, which is what makes the "one live
 * attempt" tests meaningful.
 */
let issued = 0;

const stubAdapter: ProviderAdapter = {
  id: PROVIDER,
  initiate: async () => ({
    providerRef: `ref_${PROVIDER}_${++issued}_${Date.now()}`,
    redirectUrl: REDIRECT,
  }),
  poll: async (txn) => ({
    status: 'pending',
    grossAmountMinor: txn.grossAmountMinor,
    providerFeeMinor: 0n,
    raw: {},
  }),
};

let customerId: number;
let invoiceId: number;

const audited: AuditRecord[] = [];
const audit = async (entry: AuditRecord): Promise<void> => {
  audited.push(entry);
};

beforeAll(async () => {
  resetProviderRegistry();
  registerProvider(stubAdapter);

  /*
   * Upserted, not `onConflictDoNothing`. These fixture rows outlive a run —
   * ledger history cannot be deleted, so nothing cleans them up — and a
   * do-nothing insert would silently keep whatever window an earlier version
   * of this file wrote, leaving the period claiming one year while the tests
   * date their work in another. Correcting the window is the point.
   */
  await db
    .insert(fiscalPeriods)
    .values({
      fiscalYear: FY,
      periodNo: 1,
      startsAt: PERIOD_STARTS,
      endsAt: PERIOD_ENDS,
      status: 'open',
    })
    .onConflictDoUpdate({
      target: [fiscalPeriods.fiscalYear, fiscalPeriods.periodNo],
      set: { startsAt: PERIOD_STARTS, endsAt: PERIOD_ENDS, status: 'open' },
    });

  const [customer] = await db
    .insert(customers)
    .values({
      productId: PRODUCT,
      name: 'Transaction fixture',
      externalRef: `txn-fixture-${Date.now()}`,
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
      subtotalMinor: 12_000_00n,
      totalMinor: 12_000_00n,
    })
    .returning({ id: invoices.id });

  invoiceId = invoice!.id;
});

async function makeSession(allowedProviders: string[] = [PROVIDER]) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const [session] = await db
    .insert(paymentSessions)
    .values({
      id: generateSessionId(false),
      invoiceId,
      productId: PRODUCT,
      customerId,
      amountMinor: 12_000_00n,
      allowedProviders,
      expiresAt,
      createdAt: new Date(expiresAt.getTime() - 60 * 60 * 1000),
    })
    .returning();

  return session!;
}

/** `startPayment` allocates a document number, so it must own a transaction. */
function start(sessionId: string, providerId = PROVIDER) {
  return db.transaction((tx) =>
    startPayment(tx, { sessionId, providerId }, audit, NOW),
  );
}

describe('startPayment', () => {
  it('creates a transaction and moves the session to pending', async () => {
    const session = await makeSession();

    const result = await start(session.id);

    expect(result.created).toBe(true);
    expect(result.session.status).toBe('pending');
    expect(result.transaction.status).toBe('created');
    expect(result.transaction.sessionId).toBe(session.id);
    expect(result.transaction.providerId).toBe(PROVIDER);
  });

  it('numbers the transaction in the fiscal year the attempt falls in', async () => {
    const session = await makeSession();

    const { transaction } = await start(session.id);

    expect(transaction.txnNo).toMatch(new RegExp(`^TXN-${FY}-\\d{8}$`));
  });

  it('carries the invoice, product and customer across from the session', async () => {
    const session = await makeSession();

    const { transaction } = await start(session.id);

    expect(transaction.invoiceId).toBe(invoiceId);
    expect(transaction.productId).toBe(PRODUCT);
    expect(transaction.customerId).toBe(customerId);
  });

  /**
   * The amount comes from the session, which recomputed it from the invoice.
   * Nothing on this path takes an amount from anyone.
   */
  it('takes the amount from the session', async () => {
    const session = await makeSession();

    const { transaction } = await start(session.id);

    expect(transaction.grossAmountMinor).toBe(12_000_00n);
  });

  /**
   * Zero and not an estimate. A fee is whatever the provider reports at
   * settlement, never a computed percentage (docs/RULES.md §2.7) — and for
   * a real fee only lands when a verified result carries one.
   */
  it('books no fee, and a net equal to the gross', async () => {
    const session = await makeSession();

    const { transaction } = await start(session.id);

    expect(transaction.providerFeeMinor).toBe(0n);
    expect(transaction.netAmountMinor).toBe(transaction.grossAmountMinor);
  });

  it('stores the reference the customer was given', async () => {
    const session = await makeSession();

    const { transaction, initiate } = await start(session.id);

    expect(initiate.providerRef).toBeTruthy();
    expect(transaction.providerRef).toBe(initiate.providerRef);
  });

  it('records what the customer was shown, for a later dispute', async () => {
    const session = await makeSession();

    const { transaction } = await start(session.id);

    expect(transaction.metadata).toMatchObject({
      initiate: { redirectUrl: REDIRECT },
    });
  });

  it('leaves an audit entry naming the attempt', async () => {
    const session = await makeSession();
    const before = audited.length;

    const { transaction } = await start(session.id);

    const entry = audited
      .slice(before)
      .find((e) => e.action === 'transaction.start');
    expect(entry?.resourceId).toBe(transaction.txnNo);
  });

  // ── The reason this module exists ─────────────────────────────────────────

  /**
   * A refresh of the checkout page. A second reference here means a second
   * live intent at the gateway, and the customer may complete either.
   */
  it('returns the live attempt instead of starting a second one', async () => {
    const session = await makeSession();

    const first = await start(session.id);
    const second = await start(session.id);

    expect(second.created).toBe(false);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(second.transaction.txnNo).toBe(first.transaction.txnNo);
  });

  it('shows the same reference and redirect on a refresh', async () => {
    const session = await makeSession();

    const first = await start(session.id);
    const second = await start(session.id);

    expect(second.initiate.providerRef).toBe(first.initiate.providerRef);
    expect(second.initiate.redirectUrl).toBe(REDIRECT);
  });

  it('writes exactly one transaction however many times it is called', async () => {
    const session = await makeSession();

    await start(session.id);
    await start(session.id);
    await start(session.id);

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.sessionId, session.id));

    expect(rows).toHaveLength(1);
  });

  /**
   * A terminal attempt is the record that it happened. Trying again gets a new
   * row rather than a resurrected one.
   */
  it('starts a fresh attempt after the previous one failed', async () => {
    const session = await makeSession();

    const first = await start(session.id);

    await db
      .update(transactions)
      .set({ status: 'failed' })
      .where(eq(transactions.id, first.transaction.id));

    // The session followed the failure; the customer is choosing again.
    await db
      .update(paymentSessions)
      .set({ status: 'failed' })
      .where(eq(paymentSessions.id, session.id));

    const second = await start(session.id);

    expect(second.created).toBe(true);
    expect(second.transaction.id).not.toBe(first.transaction.id);
    expect(second.transaction.providerRef).not.toBe(
      first.transaction.providerRef,
    );
  });

  // ── Refusals ──────────────────────────────────────────────────────────────

  it('refuses a provider the session never offered', async () => {
    const session = await makeSession(['esewa']);

    await expect(start(session.id)).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('refuses a provider with no adapter behind it', async () => {
    const session = await makeSession(['khalti']);

    await expect(start(session.id, 'khalti')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('refuses an expired session, and writes nothing', async () => {
    const expiresAt = new Date(Date.now() - 60_000);

    const [session] = await db
      .insert(paymentSessions)
      .values({
        id: generateSessionId(false),
        invoiceId,
        productId: PRODUCT,
        customerId,
        amountMinor: 12_000_00n,
        allowedProviders: [PROVIDER],
        expiresAt,
        createdAt: new Date(expiresAt.getTime() - 60 * 60 * 1000),
      })
      .returning();

    // Evaluated at real `now`, which is past this deadline.
    await expect(
      db.transaction((tx) =>
        startPayment(
          tx,
          { sessionId: session!.id, providerId: PROVIDER },
          audit,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.sessionId, session!.id));

    expect(rows).toHaveLength(0);
  });

  /**
   * A paid session is not payable again. The session state machine has no edge
   * out of `succeeded`, and this is that rule reaching the money path.
   */
  it('refuses a session that already succeeded', async () => {
    const session = await makeSession();
    await start(session.id);

    await db
      .update(paymentSessions)
      .set({ status: 'succeeded' })
      .where(eq(paymentSessions.id, session.id));

    await expect(start(session.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('leaves no transaction and no number behind when the attempt fails', async () => {
    const session = await makeSession(['esewa']);

    await expect(start(session.id)).rejects.toThrow();

    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.sessionId, session.id),
          eq(transactions.providerId, PROVIDER),
        ),
      );

    expect(rows).toHaveLength(0);
  });
});

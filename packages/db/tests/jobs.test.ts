/**
 * The background jobs, against real Postgres.
 *
 * These matter more than their size suggests. `poll-pending-transactions` is
 * the only thing that will ever confirm a payment where the customer closed
 * the tab, and `expire-stale-sessions` is what stops abandoned checkouts
 * accumulating as permanently "open".
 *
 * **On isolation.** Both jobs query by state across the whole table — that is
 * the self-healing property they are required to have — so they see rows the
 * sibling suites created. The poll test therefore parks every pre-existing
 * live transaction by pushing its `next_poll_at` into the future before
 * creating its own. Without that, this suite would settle another suite's
 * fixtures through the mock adapter.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { paymentSessions, transactions } from '../schema/payments';
import { accountSeeds } from '../seed/accounts';
import {
  MockProviderAdapter,
  expireStaleSessions,
  generateSessionId,
  pollPendingTransactions,
  registerProvider,
  resetProviderRegistry,
  MAX_POLL_ATTEMPTS,
} from '../../payment-core/index';
import type { AuditRecord } from '../../payment-core/audit';
import type { Receipt } from '../../payment-core/receipts/receipt';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';

const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const GROSS = 5_000_00n;

let customerId: number;

const audited: AuditRecord[] = [];
const audit = async (entry: AuditRecord): Promise<void> => {
  audited.push(entry);
};

const receipts: Receipt[] = [];
const sendReceipt = async (receipt: Receipt): Promise<void> => {
  receipts.push(receipt);
};

const HOUR = 60 * 60 * 1000;

beforeAll(async () => {
  for (const batch of [
    accountSeeds.filter((a) => a.isPostable === false),
    accountSeeds.filter((a) => a.isPostable !== false),
  ]) {
    for (const account of batch) {
      await db.insert(accounts).values(account).onConflictDoNothing();
    }
  }

  await db
    .insert(fiscalPeriods)
    .values({
      fiscalYear: FY,
      periodNo: 1,
      startsAt: new Date('1975-01-01T00:00:00Z'),
      endsAt: new Date('1976-01-01T00:00:00Z'),
      status: 'open',
    })
    .onConflictDoUpdate({
      target: [fiscalPeriods.fiscalYear, fiscalPeriods.periodNo],
      set: { status: 'open' },
    });

  const [customer] = await db
    .insert(customers)
    .values({
      productId: PRODUCT,
      name: 'Jobs fixture',
      email: 'jobs@example.com',
      externalRef: `jobs-fixture-${Date.now()}`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  // See "On isolation" above.
  await db
    .update(transactions)
    .set({ nextPollAt: new Date(Date.now() + 365 * 24 * HOUR) })
    .where(
      and(
        inArray(transactions.status, ['created', 'pending']),
        or(isNull(transactions.nextPollAt), sql`true`),
      ),
    );

  resetProviderRegistry();
  registerProvider(new MockProviderAdapter({ id: PROVIDER }));
});

async function makeSession(
  expiresAt: Date,
  status: 'created' | 'pending' = 'created',
) {
  const unique = Date.now() + Math.floor(Math.random() * 100_000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNo: `INV-${FY}-J${unique}`,
      fiscalYear: FY,
      sequenceNo: unique,
      productId: PRODUCT,
      customerId,
      status: 'issued',
      subtotalMinor: GROSS,
      totalMinor: GROSS,
    })
    .returning({ id: invoices.id });

  const [session] = await db
    .insert(paymentSessions)
    .values({
      id: generateSessionId(false),
      invoiceId: invoice!.id,
      productId: PRODUCT,
      customerId,
      amountMinor: GROSS,
      status,
      allowedProviders: [PROVIDER],
      ...(status === 'pending' ? { selectedProvider: PROVIDER } : {}),
      expiresAt,
      createdAt: new Date(expiresAt.getTime() - HOUR),
    })
    .returning();

  return { invoiceId: invoice!.id, session: session! };
}

async function makeAttempt(pollAttempts = 0) {
  const { invoiceId, session } = await makeSession(
    new Date(Date.now() + HOUR),
    'pending',
  );

  const unique = Date.now() + Math.floor(Math.random() * 100_000);

  const [txn] = await db
    .insert(transactions)
    .values({
      txnNo: `TXN-${FY}-J${String(unique).slice(-7)}`,
      sessionId: session.id,
      invoiceId,
      productId: PRODUCT,
      customerId,
      providerId: PROVIDER,
      providerRef: `jref_${unique}`,
      status: 'pending',
      grossAmountMinor: GROSS,
      providerFeeMinor: 0n,
      netAmountMinor: GROSS,
      pollAttempts,
    })
    .returning();

  return { session, txn: txn! };
}

async function reloadSession(id: string) {
  const [row] = await db
    .select()
    .from(paymentSessions)
    .where(eq(paymentSessions.id, id))
    .limit(1);

  return row!;
}

async function reloadTxn(id: number) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  return row!;
}

describe('expireStaleSessions', () => {
  it('expires a session whose deadline has passed', async () => {
    const { session } = await makeSession(new Date(Date.now() - HOUR));

    await expireStaleSessions(db, audit);

    expect((await reloadSession(session.id)).status).toBe('expired');
  });

  it('leaves a session that is still within its window', async () => {
    const { session } = await makeSession(new Date(Date.now() + HOUR));

    await expireStaleSessions(db, audit);

    expect((await reloadSession(session.id)).status).toBe('created');
  });

  /** Self-healing means a second run is a no-op, not a second expiry. */
  it('is idempotent', async () => {
    const { session } = await makeSession(new Date(Date.now() - HOUR));

    await expireStaleSessions(db, audit);
    const after = await reloadSession(session.id);

    await expireStaleSessions(db, audit);

    const again = await reloadSession(session.id);
    expect(again.status).toBe('expired');
    expect(again.updatedAt.getTime()).toBe(after.updatedAt.getTime());
  });

  it('records each expiry in the audit trail', async () => {
    const { session } = await makeSession(new Date(Date.now() - HOUR));
    const before = audited.length;

    await expireStaleSessions(db, audit);

    expect(
      audited
        .slice(before)
        .some(
          (e) => e.action === 'session.expired' && e.resourceId === session.id,
        ),
    ).toBe(true);
  });
});

describe('pollPendingTransactions', () => {
  it('settles a payment the customer never came back to confirm', async () => {
    const { txn } = await makeAttempt();

    await pollPendingTransactions(db, audit, sendReceipt, NOW);

    const settled = await reloadTxn(txn.id);
    expect(settled.status).toBe('succeeded');
    expect(settled.journalId).not.toBeNull();
  });

  it('records the attempt and schedules the next one', async () => {
    const { txn } = await makeAttempt();

    await pollPendingTransactions(db, audit, sendReceipt, NOW);

    const polled = await reloadTxn(txn.id);
    expect(polled.pollAttempts).toBe(1);
    expect(polled.lastPolledAt).not.toBeNull();
    expect(polled.nextPollAt).not.toBeNull();
    // The backoff must produce a real date; a NaN here writes null and the
    // transaction would never be selected again.
    expect(Number.isNaN(polled.nextPollAt!.getTime())).toBe(false);
  });

  /**
   * Out of attempts and still unresolved. Flagged, never failed — asserting
   * the customer did not pay is the one thing we have been unable to establish.
   */
  it('hands an exhausted attempt to a person rather than failing it', async () => {
    const { txn } = await makeAttempt(MAX_POLL_ATTEMPTS);

    await pollPendingTransactions(db, audit, sendReceipt, NOW);

    const flagged = await reloadTxn(txn.id);
    expect(flagged.status).toBe('reconciliation_required');
    expect(flagged.journalId).toBeNull();
  });
});

/**
 * `findTransactionView` — the read behind `GET /v1/transactions/{id}`.
 *
 * One property is worth a database test and the rest are not: **an integrator
 * can only see their own payments.** The serialisation is a pure function over
 * a row and the route wiring is three lines; the ownership clause is the part
 * that, if it were ever dropped while somebody edited this query for another
 * reason, would hand every SaaS every other SaaS's payment history without
 * anything failing.
 *
 * So the cases below are mostly about *not* returning a row. A transaction
 * belonging to another application and a transaction that does not exist both
 * come back `undefined`, which is what makes the route's two 404s identical —
 * it has no way to tell them apart, rather than a rule saying it must not.
 *
 * Dated inside the isolated 1975 fiscal year the payment suites claim, so the
 * `TXN-…` and `JE-…` numbers allocated here never touch the real books. Global
 * teardown asserts `v_unbalanced_journals` is empty.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { applications } from '../schema/applications';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { paymentSessions, transactions } from '../schema/payments';
import { accountSeeds } from '../seed/accounts';
import {
  completePayment,
  findTransactionView,
  generateSessionId,
} from '../../payment-core/index';
import type { AuditRecord } from '../../payment-core/audit';
import type { Receipt } from '../../payment-core/receipts/receipt';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';

/** Shared with `payment-complete.test.ts`; see the note there. */
const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const PERIOD_STARTS = new Date('1975-01-01T00:00:00Z');
const PERIOD_ENDS = new Date('1976-01-01T00:00:00Z');

const GROSS = 6_000_00n;
const FEE = 120_00n;

const marker = `txnview-${Date.now()}`;

let customerId: number;
/** Two applications, so "scoped to the caller" has something to be scoped from. */
let ours: number;
let theirs: number;

const audit = async (_entry: AuditRecord): Promise<void> => {};
const sendReceipt = async (_receipt: Receipt): Promise<void> => {};

beforeAll(async () => {
  // A previous run that failed its teardown leaves its two applications
  // behind. Clear them first, so a broken run does not silently accumulate
  // fixture credentials in the dev branch.
  await sweepFixtureApplications();

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
      name: 'Transaction view fixture',
      email: 'viewer@example.com',
      externalRef: `${marker}-customer`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  const rows = await db
    .insert(applications)
    .values([
      application(`app_test_${marker}_ours`, 'Transaction view — ours'),
      application(`app_test_${marker}_theirs`, 'Transaction view — theirs'),
    ])
    .returning({ id: applications.id, clientId: applications.clientId });

  ours = rows.find((r) => r.clientId.endsWith('_ours'))!.id;
  theirs = rows.find((r) => r.clientId.endsWith('_theirs'))!.id;
});

afterAll(sweepFixtureApplications);

/**
 * Removes every application this suite has ever created, this run or an
 * earlier one, unlinking the rows that point at them first.
 */
async function sweepFixtureApplications() {
  /*
   * The transactions stay: they carry posted journal entries, and deleting a
   * settled payment out from under a balanced journal is exactly the thing the
   * teardown check exists to catch. Only the applications are removed, and
   * only after their transactions *and sessions* have been unlinked — both
   * carry a foreign key to `applications`, and both columns are nullable,
   * which is what makes that legal.
   */
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.clientId, 'app_test_txnview-%'));

  if (stale.length === 0) return;

  const ids = stale.map((row) => row.id);

  await db
    .update(transactions)
    .set({ applicationId: null })
    .where(inArray(transactions.applicationId, ids));

  await db
    .update(paymentSessions)
    .set({ applicationId: null })
    .where(inArray(paymentSessions.applicationId, ids));

  await db.delete(applications).where(inArray(applications.id, ids));
}

function application(clientId: string, name: string) {
  return {
    productId: PRODUCT,
    name,
    clientId,
    // Not a credential anybody can use: nothing here authenticates.
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'zzzz',
    scopes: ['payment:read' as const],
  };
}

/** A settled payment owned by `applicationId`, with a real posted journal. */
async function settledPayment(applicationId: number) {
  const unique = Date.now() + Math.floor(Math.random() * 100_000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNo: `INV-${FY}-V${unique}`,
      fiscalYear: FY,
      sequenceNo: unique,
      productId: PRODUCT,
      customerId,
      status: 'issued',
      subtotalMinor: GROSS,
      totalMinor: GROSS,
    })
    .returning({ id: invoices.id, invoiceNo: invoices.invoiceNo });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const [session] = await db
    .insert(paymentSessions)
    .values({
      id: generateSessionId(false),
      invoiceId: invoice!.id,
      applicationId,
      productId: PRODUCT,
      customerId,
      amountMinor: GROSS,
      status: 'pending',
      selectedProvider: PROVIDER,
      allowedProviders: [PROVIDER],
      expiresAt,
      createdAt: new Date(expiresAt.getTime() - 60 * 60 * 1000),
    })
    .returning({ id: paymentSessions.id });

  const [txn] = await db
    .insert(transactions)
    .values({
      txnNo: `TXN-${FY}-V${String(unique).slice(-7)}`,
      sessionId: session!.id,
      invoiceId: invoice!.id,
      applicationId,
      productId: PRODUCT,
      customerId,
      providerId: PROVIDER,
      providerRef: `ref_${unique}`,
      status: 'created',
      grossAmountMinor: GROSS,
      providerFeeMinor: 0n,
      netAmountMinor: GROSS,
    })
    .returning();

  await db.transaction((tx) =>
    completePayment(
      tx,
      txn!,
      {
        status: 'succeeded',
        grossAmountMinor: GROSS,
        providerFeeMinor: FEE,
        providerTxnId: `fp_view_${unique}`,
        raw: {},
      },
      audit,
      sendReceipt,
      NOW,
    ),
  );

  return { txnNo: txn!.txnNo, invoiceNo: invoice!.invoiceNo };
}

describe('findTransactionView', () => {
  it('returns the payment to the application that owns it', async () => {
    const { txnNo, invoiceNo } = await settledPayment(ours);

    const view = await findTransactionView(txnNo, ours);

    expect(view).toBeDefined();
    expect(view!.txnNo).toBe(txnNo);
    // The invoice *number*, the handle the webhook and the SDK both use.
    expect(view!.invoiceNo).toBe(invoiceNo);
    expect(view!.status).toBe('succeeded');
    expect(view!.grossAmountMinor).toBe(GROSS);
    expect(view!.providerFeeMinor).toBe(FEE);
    expect(view!.netAmountMinor).toBe(GROSS - FEE);
    expect(view!.refundedAmountMinor).toBe(0n);
    expect(view!.providerId).toBe(PROVIDER);
    expect(view!.succeededAt).toBeInstanceOf(Date);
  });

  it('hides a payment belonging to another application', async () => {
    const { txnNo } = await settledPayment(theirs);

    // The row exists and is readable by its owner …
    expect(await findTransactionView(txnNo, theirs)).toBeDefined();
    // … and is invisible to anybody else.
    expect(await findTransactionView(txnNo, ours)).toBeUndefined();
  });

  it('answers the same way for a payment that does not exist', async () => {
    const { txnNo } = await settledPayment(theirs);

    const somebodyElses = await findTransactionView(txnNo, ours);
    const imaginary = await findTransactionView(`TXN-${FY}-99999999`, ours);

    // Identical, so the route cannot leak the difference even by accident.
    expect(somebodyElses).toBeUndefined();
    expect(imaginary).toBeUndefined();
    expect(somebodyElses).toEqual(imaginary);
  });

  it('does not return a payment with no application at all', async () => {
    const { txnNo } = await settledPayment(ours);

    await db
      .update(transactions)
      .set({ applicationId: null })
      .where(eq(transactions.txnNo, txnNo));

    /*
     * A payment raised in the admin panel has no `application_id`. SQL's
     * `NULL = 42` is not true, so it falls out of the ownership clause on its
     * own — but that is a property of the comparison rather than an intention
     * anybody wrote down, so it is asserted here.
     */
    expect(await findTransactionView(txnNo, ours)).toBeUndefined();
  });
});

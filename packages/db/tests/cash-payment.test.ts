/**
 * Cash books only on a second person's word (`payment-core/offline/cash.ts`).
 *
 * Pinned: filing writes a pending claim that books nothing; the same cash
 * filed twice is refused; confirming books it exactly as a gateway payment is
 * booked; rejecting closes it with the reason; and — the half that proves the
 * rule rather than the happy path — the database itself refuses a cash
 * `succeeded` that nobody confirmed.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { applicationCredentials, applications } from '../schema/applications';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { transactions } from '../schema/payments';
import { paymentProviders } from '../schema/providers';
import { accountSeeds } from '../seed/accounts';
import { providerSeeds } from '../seed/providers';
import {
  confirmOfflinePayment,
  isPaymentError,
  recordOfflinePayment,
  rejectOfflinePayment,
} from '../../payment-core/index';
import type { AuthenticatedApplication } from '../../payment-core/applications/authenticate';
import { nextSequenceNo } from './unique-sequence';

const PRODUCT = 'hostelhub';
const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const TOTAL = 5_000_00n;
const marker = `cashtest-${Date.now()}`;

const audit = async (): Promise<void> => {};
const sendReceipt = async (): Promise<void> => {};

let app: AuthenticatedApplication;
let customerId: number;

beforeAll(async () => {
  await sweep();

  for (const batch of [
    accountSeeds.filter((a) => a.isPostable === false),
    accountSeeds.filter((a) => a.isPostable !== false),
  ]) {
    for (const account of batch) {
      await db.insert(accounts).values(account).onConflictDoNothing();
    }
  }

  await db
    .insert(paymentProviders)
    .values(providerSeeds.find((p) => p.id === 'cash')!)
    .onConflictDoNothing();

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
      name: 'Cash fixture',
      email: 'cash@example.com',
      externalRef: `${marker}-customer`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  const [application] = await db
    .insert(applications)
    .values({
      productId: PRODUCT,
      name: `Cash fixture ${marker}`,
      scopes: ['offline_payment:record'],
    })
    .returning({ id: applications.id });

  const [credential] = await db
    .insert(applicationCredentials)
    .values({
      applicationId: application!.id,
      mode: 'test',
      clientId: `app_test_${marker}`,
      secretHash: `$argon2id$not-a-real-hash$${application!.id}`,
      secretLast4: 'zzzz',
    })
    .returning({ id: applicationCredentials.id });

  app = {
    id: application!.id,
    credentialId: credential!.id,
    clientId: `app_test_${marker}`,
    productId: PRODUCT,
    name: 'Cash fixture',
    mode: 'test',
    scopes: ['offline_payment:record'],
    webhookUrl: null,
    usedPreviousSecret: false,
    previousSecretExpiresAt: null,
  };
});

afterAll(sweep);

/** Settled transactions keep their journals; only the link to the fixture app is cut. */
async function sweep() {
  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.name, 'Cash fixture cashtest-%'));

  if (stale.length === 0) return;

  const ids = stale.map((r) => r.id);

  const credentials = await db
    .select({ id: applicationCredentials.id })
    .from(applicationCredentials)
    .where(inArray(applicationCredentials.applicationId, ids));

  await db
    .update(transactions)
    .set({ applicationId: null, credentialId: null })
    .where(inArray(transactions.applicationId, ids));

  if (credentials.length > 0) {
    await db
      .update(transactions)
      .set({ credentialId: null })
      .where(
        inArray(
          transactions.credentialId,
          credentials.map((c) => c.id),
        ),
      );
  }
  await db
    .update(invoices)
    .set({ applicationId: null })
    .where(inArray(invoices.applicationId, ids));
  await db.delete(applications).where(inArray(applications.id, ids));
}

async function invoice(): Promise<string> {
  const unique = nextSequenceNo();
  const invoiceNo = `INV-${FY}-C${unique}`;

  await db.insert(invoices).values({
    mode: 'test',
    invoiceNo,
    fiscalYear: FY,
    sequenceNo: unique,
    productId: PRODUCT,
    applicationId: app.id,
    customerId,
    status: 'issued',
    subtotalMinor: TOTAL,
    totalMinor: TOTAL,
  });

  return invoiceNo;
}

const file = (invoiceNo: string, amountMinor = TOTAL) =>
  db.transaction((tx) =>
    recordOfflinePayment(
      tx,
      app,
      { invoiceNo, amountMinor, collectedBy: 'Agent Ram', reference: 'SLIP-7' },
      audit,
      NOW,
    ),
  );

const row = async (txnNo: string) =>
  (
    await db.select().from(transactions).where(eq(transactions.txnNo, txnNo))
  )[0]!;

describe('cash', () => {
  it('is filed as a pending claim that books nothing', async () => {
    const invoiceNo = await invoice();
    const filed = await file(invoiceNo);
    const txn = await row(filed.txnNo);

    expect(txn.providerId).toBe('cash');
    expect(txn.status).toBe('pending');
    expect(txn.journalId).toBeNull();

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNo, invoiceNo));
    expect(inv!.paidMinor).toBe(0n);
  });

  it('refuses the same cash filed twice', async () => {
    const invoiceNo = await invoice();

    await file(invoiceNo);

    const again = await file(invoiceNo).catch((error: unknown) => error);
    expect(isPaymentError(again) && again.code).toBe('VALIDATION_FAILED');
  });

  it('books it on confirmation, exactly as a gateway payment is booked', async () => {
    const invoiceNo = await invoice();
    const filed = await file(invoiceNo);

    const outcome = await db.transaction((tx) =>
      confirmOfflinePayment(tx, filed.txnNo, 1, audit, sendReceipt, NOW),
    );

    expect(outcome.state).toBe('settled');

    const txn = await row(filed.txnNo);
    expect(txn.status).toBe('succeeded');
    expect(txn.approvedBy).toBe(1);
    expect(txn.journalId).not.toBeNull();

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNo, invoiceNo));
    expect(inv!.status).toBe('paid');
    expect(inv!.paidMinor).toBe(TOTAL);
  });

  it('closes a rejected claim with the reason and books nothing', async () => {
    const filed = await file(await invoice());

    await db.transaction((tx) =>
      rejectOfflinePayment(tx, filed.txnNo, 1, 'No deposit found', audit, NOW),
    );

    const txn = await row(filed.txnNo);
    expect(txn.status).toBe('failed');
    expect(txn.failureReason).toContain('No deposit found');
    expect(txn.journalId).toBeNull();
  });

  it('cannot be marked succeeded without a second person, even by hand', async () => {
    const booked = await file(await invoice());
    await db.transaction((tx) =>
      confirmOfflinePayment(tx, booked.txnNo, 1, audit, sendReceipt, NOW),
    );
    const { journalId } = await row(booked.txnNo);

    const unconfirmed = await file(await invoice());

    await expect(
      db
        .update(transactions)
        .set({ status: 'succeeded', succeededAt: NOW, journalId })
        .where(eq(transactions.txnNo, unconfirmed.txnNo)),
    ).rejects.toThrow(/cash_needs_second_person/);
  });
});

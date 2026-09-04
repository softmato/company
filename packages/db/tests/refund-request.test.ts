/**
 * `requestRefund` — filing a refund request, against real Postgres.
 *
 * The endpoint behind this cannot refund anything, and most of what is worth
 * testing is therefore about refusal:
 *
 *   * another integrator's payment is invisible, exactly as it is to
 *     `findTransactionView`;
 *   * a payment that never succeeded cannot be refunded, and the caller is
 *     told which status it is actually in;
 *   * more than the refundable balance is refused;
 *   * the row lands at `requested` and nowhere further — `approved` is
 *     unreachable from here, and the `refund_needs_second_person` CHECK is
 *     what makes that a guarantee rather than an intention.
 *
 * The one positive property that needs a database is the numbering: `RFD-…` is
 * gapless, allocated under the same advisory lock as `JE-…` and `INV-…`, and
 * two requests in a row must not collide.
 *
 * Dated inside the isolated 1975 fiscal year the payment suites claim, so the
 * numbers allocated here never touch the real books.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { applications } from '../schema/applications';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { paymentSessions, refunds, transactions } from '../schema/payments';
import { accountSeeds } from '../seed/accounts';
import {
  completePayment,
  generateSessionId,
  isPaymentError,
  requestRefund,
} from '../../payment-core/index';
import type { AuthenticatedApplication } from '../../payment-core/applications/authenticate';
import type { AuditRecord } from '../../payment-core/audit';
import type { Receipt } from '../../payment-core/receipts/receipt';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';

const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const GROSS = 9_000_00n;
const FEE = 180_00n;

const marker = `rfdtest-${Date.now()}`;

let customerId: number;
let ours: AuthenticatedApplication;
let theirs: AuthenticatedApplication;

const audited: AuditRecord[] = [];
const audit = async (entry: AuditRecord): Promise<void> => {
  audited.push(entry);
};
const sendReceipt = async (_receipt: Receipt): Promise<void> => {};

beforeAll(async () => {
  await sweepFixtures();

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
      name: 'Refund request fixture',
      email: 'refunder@example.com',
      externalRef: `${marker}-customer`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;

  const rows = await db
    .insert(applications)
    .values([row(`app_test_${marker}_ours`), row(`app_test_${marker}_theirs`)])
    .returning({ id: applications.id, clientId: applications.clientId });

  ours = authenticated(rows.find((r) => r.clientId.endsWith('_ours'))!);
  theirs = authenticated(rows.find((r) => r.clientId.endsWith('_theirs'))!);
});

afterAll(sweepFixtures);

/** Every application and refund this suite has created, this run or an earlier one. */
async function sweepFixtures() {
  await db.delete(refunds).where(like(refunds.reason, 'rfdtest:%'));

  const stale = await db
    .select({ id: applications.id })
    .from(applications)
    .where(like(applications.clientId, 'app_test_rfdtest-%'));

  if (stale.length === 0) return;

  const ids = stale.map((r) => r.id);

  /*
   * The transactions stay — they carry posted journal entries, and deleting a
   * settled payment out from under a balanced journal is what global teardown
   * exists to catch. Only the link is cut, which `application_id` being
   * nullable allows.
   */
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

function row(clientId: string) {
  return {
    productId: PRODUCT,
    name: `Refund fixture ${clientId}`,
    clientId,
    // Nothing here authenticates; `requestRefund` is given the result of
    // authentication, not a credential.
    secretHash: `$argon2id$not-a-real-hash$${clientId}`,
    secretLast4: 'zzzz',
    scopes: ['refund:request' as const, 'payment:read' as const],
  };
}

function authenticated(app: {
  id: number;
  clientId: string;
}): AuthenticatedApplication {
  return {
    id: app.id,
    clientId: app.clientId,
    productId: PRODUCT,
    name: app.clientId,
    isLive: false,
    scopes: ['refund:request', 'payment:read'],
    webhookUrl: null,
    usedPreviousSecret: false,
  };
}

/** A payment owned by `applicationId`, settled unless `settle` is false. */
async function payment(applicationId: number, settle = true) {
  const unique = Date.now() + Math.floor(Math.random() * 100_000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNo: `INV-${FY}-R${unique}`,
      fiscalYear: FY,
      sequenceNo: unique,
      productId: PRODUCT,
      customerId,
      status: 'issued',
      subtotalMinor: GROSS,
      totalMinor: GROSS,
    })
    .returning({ id: invoices.id });

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
      txnNo: `TXN-${FY}-R${String(unique).slice(-7)}`,
      sessionId: session!.id,
      invoiceId: invoice!.id,
      applicationId,
      productId: PRODUCT,
      customerId,
      providerId: PROVIDER,
      providerRef: `rfd_${unique}`,
      status: settle ? 'created' : 'pending',
      grossAmountMinor: GROSS,
      providerFeeMinor: 0n,
      netAmountMinor: GROSS,
    })
    .returning();

  if (settle) {
    await db.transaction((tx) =>
      completePayment(
        tx,
        txn!,
        {
          status: 'succeeded',
          grossAmountMinor: GROSS,
          providerFeeMinor: FEE,
          providerTxnId: `fp_rfd_${unique}`,
          raw: {},
        },
        async () => {},
        sendReceipt,
        NOW,
      ),
    );
  }

  return txn!.txnNo;
}

function file(
  application: AuthenticatedApplication,
  transactionId: string,
  extra: { amountMinor?: bigint } = {},
) {
  return db.transaction((tx) =>
    requestRefund(
      tx,
      application,
      {
        transactionId,
        ...extra,
        reason: 'rfdtest: customer cancelled within the cooling-off window',
      },
      audit,
      NOW,
    ),
  );
}

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('expected a refusal, got a filed refund');
  } catch (error) {
    if (!isPaymentError(error)) throw error;
    return error;
  }
}

describe('requestRefund', () => {
  it('files a request at status "requested" for the full balance', async () => {
    const txnNo = await payment(ours.id);

    const filed = await file(ours, txnNo);

    expect(filed.status).toBe('requested');
    expect(filed.txnNo).toBe(txnNo);
    // Defaults to everything still refundable, which for an untouched payment
    // is the gross — not the net. The provider's fee is our cost, not a
    // deduction from what the customer paid.
    expect(filed.amountMinor).toBe(GROSS);
    expect(filed.refundNo).toMatch(new RegExp(`^RFD-${FY}-\\d{6}$`));
  });

  it('leaves the money alone: the transaction is untouched', async () => {
    const txnNo = await payment(ours.id);

    await file(ours, txnNo);

    const [after] = await db
      .select({
        status: transactions.status,
        refundedAmountMinor: transactions.refundedAmountMinor,
      })
      .from(transactions)
      .where(eq(transactions.txnNo, txnNo));

    // Still succeeded, still nothing refunded. Filing is not refunding.
    expect(after!.status).toBe('succeeded');
    expect(after!.refundedAmountMinor).toBe(0n);
  });

  it('numbers refunds gaplessly', async () => {
    const first = await file(ours, await payment(ours.id));
    const second = await file(ours, await payment(ours.id));

    const sequence = (no: string) => Number(no.slice(`RFD-${FY}-`.length));

    expect(sequence(second.refundNo)).toBe(sequence(first.refundNo) + 1);
  });

  it('records who filed it', async () => {
    const before = audited.length;

    await file(ours, await payment(ours.id));

    const entry = audited[before];
    expect(entry?.action).toBe('refund.request');
    expect(entry?.actorType).toBe('application');
    expect(entry?.actorId).toBe(ours.clientId);
  });

  it('refuses another application’s payment as if it did not exist', async () => {
    const txnNo = await payment(theirs.id);

    const error = await refusal(file(ours, txnNo));

    expect(error.code).toBe('RESOURCE_NOT_FOUND');
    // Nothing in the public response distinguishes this from an imaginary
    // transaction number.
    expect(error.publicDetail).toBeUndefined();
  });

  it('refuses a transaction number that does not exist, identically', async () => {
    const error = await refusal(file(ours, `TXN-${FY}-99999999`));

    expect(error.code).toBe('RESOURCE_NOT_FOUND');
    expect(error.publicDetail).toBeUndefined();
  });

  it('refuses a payment that never succeeded, and says which status it is in', async () => {
    const txnNo = await payment(ours.id, false);

    const error = await refusal(file(ours, txnNo));

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.status).toBe(422);
    // The caller is told enough to fix it themselves: it is their own payment.
    expect(error.publicDetail).toContain('PENDING');
  });

  it('refuses more than the refundable balance', async () => {
    const txnNo = await payment(ours.id);

    const error = await refusal(file(ours, txnNo, { amountMinor: GROSS + 1n }));

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.publicDetail).toContain(String(GROSS));
  });

  it('accepts a partial amount', async () => {
    const txnNo = await payment(ours.id);

    const filed = await file(ours, txnNo, { amountMinor: 1_000_00n });

    expect(filed.amountMinor).toBe(1_000_00n);
    expect(filed.status).toBe('requested');
  });
});

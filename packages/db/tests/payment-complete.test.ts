/**
 * A payment being confirmed, against real Postgres.
 *
 * This is the money path, so what is tested is the part that cannot be checked
 * by reading the code: that the journal actually posts and balances, that a
 * repeated provider result posts exactly one of them, and that a mismatched
 * amount posts none at all.
 *
 * Everything is dated inside the isolated 1975 fiscal year that
 * `transaction-start.test.ts` claims, so the `JE-…` and `TXN-…` numbers
 * allocated here never touch the real books. The global teardown asserts
 * `v_unbalanced_journals` is empty, so a rule that posts a lopsided entry
 * fails the run even if every assertion below passes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq, like } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { journalEntries, ledgerEntries } from '../schema/ledger';
import { paymentSessions, transactions } from '../schema/payments';
import { accountSeeds } from '../seed/accounts';
import {
  completePayment,
  generateSessionId,
} from '../../payment-core/index';
import type { AuditRecord } from '../../payment-core/audit';
import type { Receipt } from '../../payment-core/receipts/receipt';
import type { VerifiedResult } from '../../payment-core/providers/types';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';

/** Shared with `transaction-start.test.ts`; see the note there. */
const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const PERIOD_STARTS = new Date('1975-01-01T00:00:00Z');
const PERIOD_ENDS = new Date('1976-01-01T00:00:00Z');

const GROSS = 12_000_00n;
const FEE = 240_00n;

/** fonepay's seeded accounts, and the receivable for a `saas` product. */
const BALANCE_ACCOUNT = '1033';
const FEE_ACCOUNT = '5010';
const RECEIVABLE_ACCOUNT = '1110';

let customerId: number;

const audited: AuditRecord[] = [];
const audit = async (entry: AuditRecord): Promise<void> => {
  audited.push(entry);
};

const receipts: Receipt[] = [];
const sendReceipt = async (receipt: Receipt): Promise<void> => {
  receipts.push(receipt);
};

function verified(overrides: Partial<VerifiedResult> = {}): VerifiedResult {
  return {
    status: 'succeeded',
    grossAmountMinor: GROSS,
    providerFeeMinor: FEE,
    providerTxnId: `fp_${Date.now()}`,
    raw: {},
    ...overrides,
  };
}

beforeAll(async () => {
  // Headers before leaves, so a parent code exists before a child points at it.
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
      name: 'Settlement fixture',
      email: 'payer@example.com',
      externalRef: `settle-fixture-${Date.now()}`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;
});

/** A session, invoice and `created` transaction ready to be settled. */
async function makePayable(total = GROSS) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNo: `INV-${FY}-${unique}`,
      fiscalYear: FY,
      sequenceNo: unique,
      productId: PRODUCT,
      customerId,
      status: 'issued',
      subtotalMinor: total,
      totalMinor: total,
    })
    .returning({ id: invoices.id, invoiceNo: invoices.invoiceNo });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const [session] = await db
    .insert(paymentSessions)
    .values({
      id: generateSessionId(false),
      invoiceId: invoice!.id,
      productId: PRODUCT,
      customerId,
      amountMinor: total,
      status: 'pending',
      selectedProvider: PROVIDER,
      allowedProviders: [PROVIDER],
      expiresAt,
      createdAt: new Date(expiresAt.getTime() - 60 * 60 * 1000),
    })
    .returning();

  const [txn] = await db
    .insert(transactions)
    .values({
      txnNo: `TXN-${FY}-${String(unique).slice(-8)}`,
      sessionId: session!.id,
      invoiceId: invoice!.id,
      productId: PRODUCT,
      customerId,
      providerId: PROVIDER,
      providerRef: `ref_${unique}`,
      status: 'created',
      grossAmountMinor: total,
      providerFeeMinor: 0n,
      netAmountMinor: total,
    })
    .returning();

  return { invoice: invoice!, session: session!, txn: txn! };
}

function settle(txn: Awaited<ReturnType<typeof makePayable>>['txn'], result = verified()) {
  return db.transaction((tx) =>
    completePayment(tx, txn, result, audit, sendReceipt, NOW),
  );
}

async function linesOf(journalId: number) {
  return db
    .select({
      accountCode: ledgerEntries.accountCode,
      direction: ledgerEntries.direction,
      amountMinor: ledgerEntries.amountMinor,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.journalId, journalId));
}

describe('completePayment', () => {
  it('posts the §9.2 journal and marks the transaction succeeded', async () => {
    const { txn } = await makePayable();

    const result = await settle(txn);

    expect(result.posted).toBe(true);
    expect(result.transaction.status).toBe('succeeded');
    expect(result.transaction.journalId).not.toBeNull();
    expect(result.journalNo).toMatch(new RegExp(`^JE-${FY}-\\d{6}$`));
  });

  it('debits the provider net, debits the fee, credits the gross', async () => {
    const { txn } = await makePayable();

    const result = await settle(txn);
    const lines = await linesOf(result.transaction.journalId!);

    expect(lines).toEqual(
      expect.arrayContaining([
        {
          accountCode: BALANCE_ACCOUNT,
          direction: 'debit',
          amountMinor: GROSS - FEE,
        },
        { accountCode: FEE_ACCOUNT, direction: 'debit', amountMinor: FEE },
        {
          accountCode: RECEIVABLE_ACCOUNT,
          direction: 'credit',
          amountMinor: GROSS,
        },
      ]),
    );
  });

  /** docs/RULES.md §2.7 — the fee is reported by the provider, never computed. */
  it('stores the reported fee and the net it implies', async () => {
    const { txn } = await makePayable();

    const result = await settle(txn, verified({ providerFeeMinor: 137_49n }));

    expect(result.transaction.providerFeeMinor).toBe(137_49n);
    expect(result.transaction.netAmountMinor).toBe(GROSS - 137_49n);
  });

  it('marks the invoice paid', async () => {
    const { txn, invoice } = await makePayable();

    await settle(txn);

    const [row] = await db
      .select({ status: invoices.status, paidMinor: invoices.paidMinor })
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);

    expect(row).toMatchObject({ status: 'paid', paidMinor: GROSS });
  });

  it('carries the session to succeeded', async () => {
    const { txn, session } = await makePayable();

    await settle(txn);

    const [row] = await db
      .select({ status: paymentSessions.status })
      .from(paymentSessions)
      .where(eq(paymentSessions.id, session.id))
      .limit(1);

    expect(row!.status).toBe('succeeded');
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  /**
   * PHASES.md Phase 4 acceptance 3, and the reason this package exists:
   * identical results must produce exactly one journal entry.
   */
  it('posts one journal however many times the same result arrives', async () => {
    const { txn } = await makePayable();

    const first = await settle(txn);

    // Re-read, as a second callback or poll would.
    const [reloaded] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txn.id))
      .limit(1);

    const second = await settle(reloaded!);
    const third = await settle(reloaded!);

    expect(second.posted).toBe(false);
    expect(third.posted).toBe(false);
    expect(second.journalNo).toBe(first.journalNo);

    const journals = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceTable, 'transactions'),
          eq(journalEntries.sourceId, String(txn.id)),
        ),
      );

    expect(journals).toHaveLength(1);
  });

  // ── Amount integrity ──────────────────────────────────────────────────────

  /**
   * docs/RULES.md §2.8 — a provider amount that differs from what we expected
   * is flagged for a human and never reconciled automatically.
   */
  it('flags a mismatched amount and posts nothing', async () => {
    const { txn } = await makePayable();

    await expect(
      settle(txn, verified({ grossAmountMinor: GROSS - 1n })),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });

    const [row] = await db
      .select({ status: transactions.status, journalId: transactions.journalId })
      .from(transactions)
      .where(eq(transactions.id, txn.id))
      .limit(1);

    expect(row).toMatchObject({
      status: 'reconciliation_required',
      journalId: null,
    });
  });

  it('leaves the invoice unpaid when the amount did not match', async () => {
    const { txn, invoice } = await makePayable();

    await expect(
      settle(txn, verified({ grossAmountMinor: GROSS + 500n })),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });

    const [row] = await db
      .select({ status: invoices.status, paidMinor: invoices.paidMinor })
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);

    expect(row).toMatchObject({ status: 'issued', paidMinor: 0n });
  });

  it('refuses a result that is not a success', async () => {
    const { txn } = await makePayable();

    await expect(
      settle(txn, verified({ status: 'pending' })),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  // ── The receipt ───────────────────────────────────────────────────────────

  it('sends the payer a receipt for the gross amount', async () => {
    const { txn, invoice } = await makePayable();
    const before = receipts.length;

    const result = await settle(txn);

    const sent = receipts.slice(before);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      receiptNo: result.transaction.txnNo,
      invoiceNo: invoice.invoiceNo,
      payerEmail: 'payer@example.com',
      // Gross, not net of the fee.
      amountMinor: GROSS,
      providerName: 'Fonepay',
      journalNo: result.journalNo,
    });
  });

  it('sends no receipt when nothing was posted', async () => {
    const { txn } = await makePayable();

    await settle(txn);

    const [reloaded] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txn.id))
      .limit(1);

    const before = receipts.length;
    await settle(reloaded!);

    expect(receipts).toHaveLength(before);
  });

  /**
   * The failure this ordering exists to prevent: an email problem must not
   * unwind a posted journal. A sender that throws is contained.
   */
  it('keeps the payment settled when the receipt cannot be sent', async () => {
    const { txn, invoice } = await makePayable();

    const result = await db.transaction((tx) =>
      completePayment(
        tx,
        txn,
        verified(),
        audit,
        async () => {
          throw new Error('mail server on fire');
        },
        NOW,
      ),
    );

    expect(result.posted).toBe(true);
    expect(result.transaction.status).toBe('succeeded');

    const [row] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);

    expect(row!.status).toBe('paid');
  });

  it('records the settlement in the audit trail', async () => {
    const { txn } = await makePayable();
    const before = audited.length;

    const result = await settle(txn);

    const entry = audited
      .slice(before)
      .find((e) => e.action === 'payment.succeeded');

    expect(entry?.resourceId).toBe(result.transaction.txnNo);
  });
});

describe('the books after settlement', () => {
  it('leaves every journal this suite posted balanced', async () => {
    const posted = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(like(journalEntries.journalNo, `JE-${FY}-%`));

    for (const journal of posted) {
      const lines = await linesOf(journal.id);

      const signed = lines.reduce(
        (sum, line) =>
          sum +
          (line.direction === 'debit' ? line.amountMinor : -line.amountMinor),
        0n,
      );

      expect(signed).toBe(0n);
    }
  });
});

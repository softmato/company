/**
 * The settlement dispatcher, against real Postgres.
 *
 * `settleTransaction` is the layer that decides *which* thing a provider's
 * answer calls for. It was the piece missing between the adapters and
 * `completePayment`, so nothing had ever checked the decisions it makes — and
 * they are the decisions that either protect the ledger or quietly corrupt it.
 *
 * Four of the cases below are about refusing to act:
 *
 *   * a repeated success posts one journal, not five;
 *   * a `pending` result writes nothing at all;
 *   * a provider reporting `refunded` does not book a refund we have no
 *     reversing entries for;
 *   * a late `failed` arriving after a payment settled does not unsettle it.
 *
 * That last one is the sharpest: a callback settles a payment while a poll is
 * still in flight, the poll returns the pre-payment state, and applying it
 * would move a transaction with a posted journal behind it to `failed`.
 *
 * Dated inside the isolated 1975 fiscal year the sibling suites claim, so
 * nothing here touches the real books. Global teardown asserts
 * `v_unbalanced_journals` is empty.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { customers } from '../schema/customers';
import { fiscalPeriods } from '../schema/fiscal';
import { invoices } from '../schema/invoices';
import { journalEntries } from '../schema/ledger';
import { paymentSessions, transactions } from '../schema/payments';
import { accountSeeds } from '../seed/accounts';
import { generateSessionId, settleTransaction } from '../../payment-core/index';
import type { AuditRecord } from '../../payment-core/audit';
import type { Receipt } from '../../payment-core/receipts/receipt';
import type { VerifiedResult } from '../../payment-core/providers/types';

const PRODUCT = 'hostelhub';
const PROVIDER = 'fonepay';

const FY = 'TXN/00';
const NOW = new Date('1975-06-01T00:00:00Z');
const PERIOD_STARTS = new Date('1975-01-01T00:00:00Z');
const PERIOD_ENDS = new Date('1976-01-01T00:00:00Z');

const GROSS = 8_000_00n;
const FEE = 160_00n;

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
    providerTxnId: `fp_settle_${Date.now()}`,
    raw: {},
    ...overrides,
  };
}

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
      name: 'Settle dispatch fixture',
      email: 'dispatch@example.com',
      externalRef: `settle-dispatch-${Date.now()}`,
    })
    .returning({ id: customers.id });

  customerId = customer!.id;
});

async function makePayable(total = GROSS) {
  const unique = Date.now() + Math.floor(Math.random() * 100_000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNo: `INV-${FY}-D${unique}`,
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
      txnNo: `TXN-${FY}-D${String(unique).slice(-7)}`,
      sessionId: session!.id,
      invoiceId: invoice!.id,
      productId: PRODUCT,
      customerId,
      providerId: PROVIDER,
      providerRef: `dref_${unique}`,
      status: 'created',
      grossAmountMinor: total,
      providerFeeMinor: 0n,
      netAmountMinor: total,
    })
    .returning();

  return { invoice: invoice!, session: session!, txn: txn! };
}

function dispatch(
  txn: Awaited<ReturnType<typeof makePayable>>['txn'],
  result = verified(),
) {
  return db.transaction((tx) =>
    settleTransaction(tx, txn, result, audit, sendReceipt, NOW),
  );
}

/** Journals actually written for a transaction — the ledger's own count. */
async function journalCount(transactionId: number): Promise<number> {
  const rows = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(eq(journalEntries.sourceId, String(transactionId)));

  return rows.length;
}

async function reload(id: number) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  return row!;
}

describe('a successful result', () => {
  it('settles the payment and reports the journal', async () => {
    const { txn } = await makePayable();

    const outcome = await dispatch(txn);

    expect(outcome.state).toBe('settled');
    if (outcome.state !== 'settled') return;

    expect(outcome.replayed).toBe(false);
    expect(outcome.journalNo).toMatch(new RegExp(`^JE-${FY}-\\d{6}$`));
    expect(outcome.transaction.status).toBe('succeeded');
  });

  /** PHASES.md Phase 4 acceptance 3, proved against the database. */
  it('posts exactly one journal however many times it arrives', async () => {
    const { txn } = await makePayable();

    const first = await dispatch(txn);
    expect(first.state).toBe('settled');

    // The same result four more times, as a retrying gateway would send it.
    for (let i = 0; i < 4; i += 1) {
      const again = await dispatch(await reload(txn.id));

      expect(again.state).toBe('settled');
      if (again.state === 'settled') expect(again.replayed).toBe(true);
    }

    expect(await journalCount(txn.id)).toBe(1);
  });

  it('sends one receipt, not one per delivery', async () => {
    const { txn } = await makePayable();
    const before = receipts.length;

    await dispatch(txn);
    await dispatch(await reload(txn.id));
    await dispatch(await reload(txn.id));

    expect(receipts.length - before).toBe(1);
  });
});

describe('a pending result', () => {
  it('writes nothing at all', async () => {
    const { txn } = await makePayable();
    const auditedBefore = audited.length;

    const outcome = await dispatch(txn, verified({ status: 'pending' }));

    expect(outcome.state).toBe('pending');
    expect((await reload(txn.id)).status).toBe('created');
    expect(await journalCount(txn.id)).toBe(0);
    // "Still going" is the absence of news; it must not fill the audit log.
    expect(audited.length).toBe(auditedBefore);
  });
});

describe('a failed result', () => {
  it('closes the transaction without posting anything', async () => {
    const { txn } = await makePayable();

    const outcome = await dispatch(txn, verified({ status: 'failed' }));

    expect(outcome.state).toBe('closed');
    expect((await reload(txn.id)).status).toBe('failed');
    expect(await journalCount(txn.id)).toBe(0);
  });

  /**
   * The race that would corrupt the ledger: a poll already in flight returns
   * the pre-payment state after the callback has settled. Applying it would
   * leave a `failed` transaction with a posted journal crediting revenue.
   */
  it('cannot unsettle a payment that already succeeded', async () => {
    const { txn } = await makePayable();

    await dispatch(txn);
    const settled = await reload(txn.id);

    const late = await dispatch(settled, verified({ status: 'failed' }));

    expect(late.state).toBe('reconciliation');
    expect((await reload(txn.id)).status).toBe('succeeded');
    expect(await journalCount(txn.id)).toBe(1);
  });
});

/**
 * Found by cancelling a real Khalti sandbox payment and reloading the page.
 *
 * `cancelled` is terminal, so the second dispatch attempted `cancelled →
 * cancelled`, got `ILLEGAL_TRANSITION`, and `confirmTransaction` reported that
 * as `pending` — the answer for a lost race, which this is not. The customer
 * saw "your payment is still being confirmed, we will email a receipt as soon
 * as it does" about a payment they had just deliberately stopped.
 */
describe('a result that arrives after the transaction already closed', () => {
  it('reports the closure again rather than claiming it is pending', async () => {
    const { txn } = await makePayable();

    const first = await dispatch(txn, verified({ status: 'cancelled' }));
    expect(first.state).toBe('closed');

    const closed = await reload(txn.id);
    const second = await dispatch(closed, verified({ status: 'cancelled' }));

    expect(second.state).toBe('closed');
    expect((second as { status: string }).status).toBe('cancelled');
    expect((await reload(txn.id)).status).toBe('cancelled');
    expect(await journalCount(txn.id)).toBe(0);
  });

  it('does not resurrect a cancelled payment when the provider later says failed', async () => {
    const { txn } = await makePayable();

    await dispatch(txn, verified({ status: 'cancelled' }));
    const closed = await reload(txn.id);

    const late = await dispatch(closed, verified({ status: 'failed' }));

    expect(late.state).toBe('closed');
    expect((await reload(txn.id)).status).toBe('cancelled');
    expect(await journalCount(txn.id)).toBe(0);
  });
});

describe('a mismatched amount', () => {
  it('posts nothing and holds the payment for a person', async () => {
    const { txn } = await makePayable();

    const outcome = await dispatch(
      txn,
      verified({ grossAmountMinor: GROSS + 1_00n }),
    );

    expect(outcome.state).toBe('reconciliation');
    expect((await reload(txn.id)).status).toBe('reconciliation_required');
    expect(await journalCount(txn.id)).toBe(0);
  });

  /** RULES.md §2.8 — a flag is left alone until a human moves it. */
  it('is not resolved by a later poll that agrees with us', async () => {
    const { txn } = await makePayable();

    await dispatch(txn, verified({ grossAmountMinor: GROSS + 1_00n }));
    const flagged = await reload(txn.id);

    const outcome = await dispatch(flagged, verified());

    expect(outcome.state).toBe('reconciliation');
    expect((await reload(txn.id)).status).toBe('reconciliation_required');
    expect(await journalCount(txn.id)).toBe(0);
  });
});

describe('a refunded result', () => {
  /**
   * Reversing entries do not exist yet, so booking this would leave the ledger
   * showing money as ours while the transaction said otherwise — with nothing
   * recording the disagreement.
   */
  it('is flagged rather than applied', async () => {
    const { txn } = await makePayable();

    const outcome = await dispatch(txn, verified({ status: 'refunded' }));

    expect(outcome.state).toBe('reconciliation');
    expect((await reload(txn.id)).status).toBe('reconciliation_required');
    expect(await journalCount(txn.id)).toBe(0);
  });
});

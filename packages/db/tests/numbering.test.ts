/**
 * Gapless document numbering, against real Postgres.
 *
 * These exist because of a bug that survived Phase 1 acceptance: the allocator
 * built its query as `SUBSTRING(journal_no FROM $1)`, and an untyped parameter
 * there selects the POSIX *regex* overload of `substring`. The offset was read
 * as a pattern, matched nothing, and every row produced NULL — so `MAX(...)`
 * was NULL and the allocator returned sequence 1 forever.
 *
 * Nothing caught it because nothing ever asked for a *second* number: the
 * ledger tests write random suffixes rather than allocated ones. So the first
 * test below is deliberately about the second allocation, not the first.
 *
 * Nothing is cleaned up afterwards, and nothing can be: ledger history is
 * immutable by trigger. The tests are written to run against whatever an
 * earlier run left behind, which is the same constraint the real books have.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { and, eq, like } from 'drizzle-orm';

import { db } from '../client';
import { accounts } from '../schema/accounts';
import { fiscalPeriods } from '../schema/fiscal';
import { journalEntries, ledgerEntries } from '../schema/ledger';
import { accountSeeds } from '../seed/accounts';
import {
  allocateDocumentNo,
  formatDocumentNo,
} from '../../accounting/numbering';

/** Isolated from any real BS year, and from any window a real date falls in. */
const FY = 'NUM/00';

/** Any journal needs at least two balanced lines — migration `0002`. */
const DEBIT_ACCOUNT = '1020';
const CREDIT_ACCOUNT = '4010';

let periodId: number;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertJournal(tx: Tx, journalNo: string): Promise<void> {
  const [journal] = await tx
    .insert(journalEntries)
    .values({
      journalNo,
      fiscalPeriodId: periodId,
      source: 'manual',
      description: 'numbering fixture',
      occurredAt: new Date('1980-06-01T00:00:00Z'),
    })
    .returning({ id: journalEntries.id });

  await tx.insert(ledgerEntries).values([
    {
      journalId: journal!.id,
      lineNo: 1,
      accountCode: DEBIT_ACCOUNT,
      direction: 'debit',
      amountMinor: 100n,
    },
    {
      journalId: journal!.id,
      lineNo: 2,
      accountCode: CREDIT_ACCOUNT,
      direction: 'credit',
      amountMinor: 100n,
    },
  ]);
}

async function allocatedSoFar(): Promise<number> {
  const rows = await db
    .select({ journalNo: journalEntries.journalNo })
    .from(journalEntries)
    .where(like(journalEntries.journalNo, `JE-${FY}-%`));

  return rows.filter((row) =>
    /^[0-9]+$/.test(row.journalNo.slice(`JE-${FY}-`.length)),
  ).length;
}

beforeAll(async () => {
  // Reference data the ledger foreign-keys onto. Headers before leaves, so a
  // parent code exists before a child points at it.
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
      startsAt: new Date('1980-01-01T00:00:00Z'),
      endsAt: new Date('1981-01-01T00:00:00Z'),
      status: 'open',
    })
    .onConflictDoNothing();

  const [existing] = await db
    .select({ id: fiscalPeriods.id })
    .from(fiscalPeriods)
    .where(and(eq(fiscalPeriods.fiscalYear, FY), eq(fiscalPeriods.periodNo, 1)))
    .limit(1);

  periodId = existing!.id;
});

describe('allocateDocumentNo', () => {
  test('advances past the first number', async () => {
    const start = await allocatedSoFar();

    // Three in a row. The second is the one the old implementation could not
    // produce — it handed out sequence 1 every time and collided.
    for (let offset = 1; offset <= 3; offset++) {
      await db.transaction(async (tx) => {
        const { sequence, documentNo } = await allocateDocumentNo(tx, 'JE', FY);

        expect(sequence).toBe(start + offset);
        expect(documentNo).toBe(
          `JE-${FY}-${String(start + offset).padStart(6, '0')}`,
        );

        // Allocation reads the rows themselves, so a number only counts once
        // it is committed on one.
        await insertJournal(tx, documentNo);
      });
    }
  });

  test('leaves no hole when a transaction rolls back', async () => {
    const start = await allocatedSoFar();

    await expect(
      db.transaction(async (tx) => {
        await allocateDocumentNo(tx, 'JE', FY);
        throw new Error('abandon');
      }),
    ).rejects.toThrow('abandon');

    // The advisory lock is transaction-scoped and the number is read from the
    // rows, so an abandoned allocation consumes nothing. A Postgres sequence
    // could not promise this — sequences skip on rollback by design.
    await db.transaction(async (tx) => {
      const { sequence } = await allocateDocumentNo(tx, 'JE', FY);
      expect(sequence).toBe(start + 1);
    });
  });

  test('ignores document numbers that are not ours to count', async () => {
    const start = await allocatedSoFar();

    // Fixtures elsewhere write random suffixes into this table. One of those
    // inside the prefix would make the ::BIGINT cast throw for the whole query
    // if it were not filtered out.
    const junk = `JE-${FY}-x${Math.random().toString(36).slice(2, 8)}`;
    await db.transaction((tx) => insertJournal(tx, junk));

    await db.transaction(async (tx) => {
      const { sequence } = await allocateDocumentNo(tx, 'JE', FY);
      expect(sequence).toBe(start + 1);
    });
  });
});

describe('formatDocumentNo', () => {
  test('pads to the width the audit trail expects', () => {
    expect(formatDocumentNo('JE', '2083/84', 1)).toBe('JE-2083/84-000001');
    expect(formatDocumentNo('INV', '2083/84', 42)).toBe('INV-2083/84-000042');
    // Transactions are eight wide — there will be more of them than journals.
    expect(formatDocumentNo('TXN', '2083/84', 1)).toBe('TXN-2083/84-00000001');
  });
});

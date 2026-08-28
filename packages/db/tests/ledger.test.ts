/**
 * The four guarantees, exercised against a real Postgres.
 *
 * These tests deliberately bypass `postJournal()` and write to the tables
 * directly. The point is to prove the DATABASE rejects these things — a test
 * that only proved application code rejects them would pass even if the
 * triggers were dropped. docs/TESTING.md §2, docs/DATABASE.md §2.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '../client';
import { accounts, products } from '../schema/accounts';
import { fiscalPeriods } from '../schema/fiscal';
import { journalEntries, ledgerEntries } from '../schema/ledger';
import { accountSeeds } from '../seed/accounts';
import { productSeeds } from '../seed/products';

/** Isolated from any real BS year so these rows can never be mistaken for books. */
const TEST_FISCAL_YEAR = 'TEST/00';

let openPeriodId: number;
let closedPeriodId: number;

const unique = () => Math.random().toString(36).slice(2, 10);

async function insertJournal(
  tx: typeof db,
  periodId: number,
  overrides: { source?: 'manual' | 'period_close' } = {},
): Promise<number> {
  const [journal] = await tx
    .insert(journalEntries)
    .values({
      journalNo: `JE-${TEST_FISCAL_YEAR}-${unique()}`,
      fiscalPeriodId: periodId,
      source: overrides.source ?? 'manual',
      description: 'test entry',
      occurredAt: new Date(),
    })
    .returning();

  return journal!.id;
}

beforeAll(async () => {
  // Accounts and products are reference data the ledger foreign-keys onto.
  const headers = accountSeeds.filter((a) => a.isPostable === false);
  const leaves = accountSeeds.filter((a) => a.isPostable !== false);
  for (const batch of [headers, leaves]) {
    for (const account of batch) {
      await db.insert(accounts).values(account).onConflictDoNothing();
    }
  }
  await db.insert(products).values(productSeeds).onConflictDoNothing();

  /*
   * A narrow window in the past, deliberately.
   *
   * This period used to span 2000–2100, which covered every real date — so
   * `resolveFiscalPeriod()` matched it ahead of the seeded BS year and every
   * journal posted in development landed in the test books. These tests insert
   * `fiscalPeriodId` directly and never resolve by date, so the window only
   * has to exist, not to contain `now()`.
   */
  openPeriodId = await ensurePeriod(
    1,
    new Date('1995-01-01T00:00:00Z'),
    new Date('1996-01-01T00:00:00Z'),
    'open',
  );
  closedPeriodId = await ensurePeriod(
    2,
    new Date('1990-01-01T00:00:00Z'),
    new Date('1991-01-01T00:00:00Z'),
    'closed',
  );
});

/**
 * Idempotent: journals posted by an earlier run reference these periods, and
 * ledger history cannot be deleted, so the fixtures are reused rather than
 * recreated.
 */
async function ensurePeriod(
  periodNo: number,
  startsAt: Date,
  endsAt: Date,
  status: 'open' | 'closed',
): Promise<number> {
  const [inserted] = await db
    .insert(fiscalPeriods)
    .values({
      fiscalYear: TEST_FISCAL_YEAR,
      periodNo,
      startsAt,
      endsAt,
      status,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted.id;

  const [existing] = await db
    .select()
    .from(fiscalPeriods)
    .where(
      and(
        eq(fiscalPeriods.fiscalYear, TEST_FISCAL_YEAR),
        eq(fiscalPeriods.periodNo, periodNo),
      ),
    )
    .limit(1);

  return existing!.id;
}

describe('guarantee 1 — a journal cannot commit unbalanced', () => {
  test('the database rejects an unbalanced journal at COMMIT', async () => {
    await expect(
      db.transaction(async (tx) => {
        const journalId = await insertJournal(tx as typeof db, openPeriodId);
        await tx.insert(ledgerEntries).values([
          {
            journalId,
            lineNo: 1,
            accountCode: '1032',
            direction: 'debit',
            amountMinor: 500000n,
          },
          {
            journalId,
            lineNo: 2,
            accountCode: '1110',
            direction: 'credit',
            amountMinor: 400000n, // ← does not balance
          },
        ]);
      }),
    ).rejects.toThrow(/unbalanced/i);
  });

  /**
   * Enforced by `journal_entries_have_lines`, a deferred constraint trigger
   * added in migration 0002. The check in `assert_journal_balanced()` cannot
   * do this on its own: it fires AFTER INSERT ON ledger_entries, and a journal
   * with no lines never inserts one.
   */
  test('a journal with no lines is rejected', async () => {
    await expect(
      db.transaction(async (tx) => {
        await insertJournal(tx as typeof db, openPeriodId);
      }),
    ).rejects.toThrow(/no lines/i);
  });

  test('a balanced journal commits and reaches v_trial_balance', async () => {
    const amount = 123400n;

    const journalId = await db.transaction(async (tx) => {
      const id = await insertJournal(tx as typeof db, openPeriodId);
      await tx.insert(ledgerEntries).values([
        {
          journalId: id,
          lineNo: 1,
          accountCode: '1020',
          direction: 'debit',
          amountMinor: amount,
          productId: 'corporate',
        },
        {
          journalId: id,
          lineNo: 2,
          accountCode: '1110',
          direction: 'credit',
          amountMinor: amount,
        },
      ]);
      return id;
    });

    expect(journalId).toBeGreaterThan(0);

    const trialBalance = await db.execute<{
      code: string;
      debit_minor: string;
    }>(
      sql`SELECT code, debit_minor FROM v_trial_balance
          WHERE code = '1020' AND fiscal_year = ${TEST_FISCAL_YEAR}`,
    );

    expect(trialBalance.rows.length).toBe(1);
    expect(BigInt(trialBalance.rows[0]!.debit_minor)).toBeGreaterThanOrEqual(
      amount,
    );
  });
});

describe('guarantee 2 — ledger rows are immutable', () => {
  let lineId: number;

  beforeAll(async () => {
    await db.transaction(async (tx) => {
      const journalId = await insertJournal(tx as typeof db, openPeriodId);
      const rows = await tx
        .insert(ledgerEntries)
        .values([
          {
            journalId,
            lineNo: 1,
            accountCode: '1020',
            direction: 'debit',
            amountMinor: 100n,
          },
          {
            journalId,
            lineNo: 2,
            accountCode: '1110',
            direction: 'credit',
            amountMinor: 100n,
          },
        ])
        .returning();
      lineId = rows[0]!.id;
    });
  });

  test('a ledger row cannot be updated', async () => {
    await expect(
      db
        .update(ledgerEntries)
        .set({ amountMinor: 1n })
        .where(eq(ledgerEntries.id, lineId)),
    ).rejects.toThrow(/not permitted/i);
  });

  test('a ledger row cannot be deleted', async () => {
    await expect(
      db.delete(ledgerEntries).where(eq(ledgerEntries.id, lineId)),
    ).rejects.toThrow(/not permitted/i);
  });

  test('a journal entry cannot be deleted', async () => {
    await expect(
      db
        .delete(journalEntries)
        .where(eq(journalEntries.fiscalPeriodId, openPeriodId)),
    ).rejects.toThrow(/cannot be deleted/i);
  });
});

describe('guarantee 3 — closed periods reject postings', () => {
  test('a closed period rejects a new journal', async () => {
    await expect(
      db.transaction(async (tx) => {
        await insertJournal(tx as typeof db, closedPeriodId);
      }),
    ).rejects.toThrow(/cannot post/i);
  });

  test('a closed period still accepts a period_close journal', async () => {
    await expect(
      db.transaction(async (tx) => {
        const journalId = await insertJournal(tx as typeof db, closedPeriodId, {
          source: 'period_close',
        });
        await tx.insert(ledgerEntries).values([
          {
            journalId,
            lineNo: 1,
            accountCode: '1020',
            direction: 'debit',
            amountMinor: 100n,
          },
          {
            journalId,
            lineNo: 2,
            accountCode: '1110',
            direction: 'credit',
            amountMinor: 100n,
          },
        ]);
      }),
    ).resolves.not.toThrow();
  });
});

describe('postable-account guard', () => {
  test('a non-postable header account rejects a line', async () => {
    await expect(
      db.transaction(async (tx) => {
        const journalId = await insertJournal(tx as typeof db, openPeriodId);
        await tx.insert(ledgerEntries).values([
          {
            journalId,
            lineNo: 1,
            accountCode: '1000', // ▸ CURRENT ASSETS — a header, not postable
            direction: 'debit',
            amountMinor: 100n,
          },
          {
            journalId,
            lineNo: 2,
            accountCode: '1110',
            direction: 'credit',
            amountMinor: 100n,
          },
        ]);
      }),
    ).rejects.toThrow(/not postable/i);
  });
});

describe('guarantee 4 — an admin cannot exist without 2FA', () => {
  test('an active admin with totp_enabled false is not representable', async () => {
    await expect(
      db.execute(sql`
        INSERT INTO admin_users (email, name, password_hash, totp_enabled, is_active)
        VALUES (${`no-2fa-${unique()}@example.com`}, 'No 2FA', 'x', false, true)
      `),
    ).rejects.toThrow(/totp_required/i);
  });
});

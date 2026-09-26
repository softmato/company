/**
 * The chart of accounts, and one account's general ledger.
 */
import 'server-only';
import { and, asc, eq, lt, sql } from 'drizzle-orm';

import {
  accounts,
  db,
  fiscalPeriods,
  journalEntries,
  ledgerEntries,
  products,
  type Account,
  type CredentialMode,
} from '@softmato/db';

import { naturalBalance, type AccountClass } from './statements-math';
import { inMode } from './scope';
import { accountTotals } from './totals';

export interface ChartRow extends Account {
  debitMinor: bigint;
  creditMinor: bigint;
  balanceMinor: bigint;
}

export async function chartOfAccounts(
  fiscalYear: string,
  mode: CredentialMode,
): Promise<ChartRow[]> {
  const [all, totals] = await Promise.all([
    db.select().from(accounts).orderBy(asc(accounts.code)),
    accountTotals({ fiscalYear, mode }),
  ]);

  return all.map((account) => {
    const t = totals.find((x) => x.code === account.code);
    const debitMinor = t?.debitMinor ?? 0n;
    const creditMinor = t?.creditMinor ?? 0n;

    return {
      ...account,
      debitMinor,
      creditMinor,
      balanceMinor: naturalBalance({ ...account, debitMinor, creditMinor }),
    };
  });
}

export interface LedgerLine {
  journalNo: string;
  occurredAt: Date;
  description: string;
  memo: string | null;
  productName: string | null;
  debitMinor: bigint;
  creditMinor: bigint;
  /** After this line, in the account's natural sign. */
  runningMinor: bigint;
}

export interface AccountLedger {
  account: Account;
  /** Carried in from earlier years — balance-sheet accounts only. */
  openingMinor: bigint;
  lines: LedgerLine[];
  closingMinor: bigint;
}

const BALANCE_SHEET = new Set<AccountClass>(['asset', 'liability', 'equity']);

// ponytail: every line of the year in one query — paginate if one account passes a few thousand lines a year
export async function accountLedger(
  code: string,
  fiscalYear: string,
  mode: CredentialMode,
): Promise<AccountLedger | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.code, code))
    .limit(1);
  if (!account) return null;

  const carries = BALANCE_SHEET.has(account.class);

  const [opening] = carries
    ? await db
        .select({
          debit: sql<string>`coalesce(sum(CASE WHEN ${ledgerEntries.direction} = 'debit' THEN ${ledgerEntries.amountMinor} ELSE 0 END), 0)`,
          credit: sql<string>`coalesce(sum(CASE WHEN ${ledgerEntries.direction} = 'credit' THEN ${ledgerEntries.amountMinor} ELSE 0 END), 0)`,
        })
        .from(ledgerEntries)
        .innerJoin(
          journalEntries,
          eq(journalEntries.id, ledgerEntries.journalId),
        )
        .innerJoin(
          fiscalPeriods,
          eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
        )
        .where(
          and(
            eq(ledgerEntries.accountCode, code),
            lt(fiscalPeriods.fiscalYear, fiscalYear),
            sql`${fiscalPeriods.fiscalYear} ~ '^[0-9]{4}/[0-9]{2}$'`,
            inMode(mode),
          ),
        )
    : [];

  const openingMinor = opening
    ? naturalBalance({
        ...account,
        debitMinor: BigInt(opening.debit),
        creditMinor: BigInt(opening.credit),
      })
    : 0n;

  const rows = await db
    .select({
      journalNo: journalEntries.journalNo,
      occurredAt: journalEntries.occurredAt,
      description: journalEntries.description,
      memo: ledgerEntries.memo,
      productName: products.name,
      direction: ledgerEntries.direction,
      amountMinor: ledgerEntries.amountMinor,
    })
    .from(ledgerEntries)
    .innerJoin(journalEntries, eq(journalEntries.id, ledgerEntries.journalId))
    .innerJoin(
      fiscalPeriods,
      eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
    )
    .leftJoin(products, eq(products.id, ledgerEntries.productId))
    .where(
      and(
        eq(ledgerEntries.accountCode, code),
        eq(fiscalPeriods.fiscalYear, fiscalYear),
        inMode(mode),
      ),
    )
    .orderBy(
      asc(journalEntries.occurredAt),
      asc(journalEntries.id),
      asc(ledgerEntries.lineNo),
    );

  let running = openingMinor;
  const lines = rows.map(({ direction, amountMinor, ...r }) => {
    const debitMinor = direction === 'debit' ? amountMinor : 0n;
    const creditMinor = direction === 'credit' ? amountMinor : 0n;
    running += naturalBalance({ ...account, debitMinor, creditMinor });
    return { ...r, debitMinor, creditMinor, runningMinor: running };
  });

  return { account, openingMinor, lines, closingMinor: running };
}

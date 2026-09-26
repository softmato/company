/**
 * Per-account debit and credit totals — the one query every statement is
 * built from. One fiscal year, or everything up to and including it (a
 * balance sheet is cumulative); one mode; optionally one product.
 */
import 'server-only';
import { and, asc, eq, isNull, lte, sql, type SQL } from 'drizzle-orm';

import {
  accounts,
  db,
  fiscalPeriods,
  journalEntries,
  ledgerEntries,
  type CredentialMode,
} from '@softmato/db';

import type { AccountTotals } from './statements-math';
import { inMode } from './scope';

export interface TotalsQuery {
  fiscalYear: string;
  mode: CredentialMode;
  /** Every year up to and including `fiscalYear`, for a balance sheet. */
  cumulative?: boolean;
  /** A product id, or `null` for lines with no product. Omit for all. */
  productId?: string | null;
}

const debit = sql<string>`coalesce(sum(CASE WHEN ${ledgerEntries.direction} = 'debit' THEN ${ledgerEntries.amountMinor} ELSE 0 END), 0)`;
const credit = sql<string>`coalesce(sum(CASE WHEN ${ledgerEntries.direction} = 'credit' THEN ${ledgerEntries.amountMinor} ELSE 0 END), 0)`;

function yearFilter(q: TotalsQuery): SQL {
  return q.cumulative
    ? and(
        lte(fiscalPeriods.fiscalYear, q.fiscalYear),
        sql`${fiscalPeriods.fiscalYear} ~ '^[0-9]{4}/[0-9]{2}$'`,
      )!
    : eq(fiscalPeriods.fiscalYear, q.fiscalYear);
}

function productFilter(q: TotalsQuery): SQL | undefined {
  if (q.productId === undefined) return undefined;
  return q.productId === null
    ? isNull(ledgerEntries.productId)
    : eq(ledgerEntries.productId, q.productId);
}

export async function accountTotals(q: TotalsQuery): Promise<AccountTotals[]> {
  const rows = await db
    .select({
      code: accounts.code,
      name: accounts.name,
      class: accounts.class,
      debit,
      credit,
    })
    .from(ledgerEntries)
    .innerJoin(journalEntries, eq(journalEntries.id, ledgerEntries.journalId))
    .innerJoin(
      fiscalPeriods,
      eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
    )
    .innerJoin(accounts, eq(accounts.code, ledgerEntries.accountCode))
    .where(and(yearFilter(q), inMode(q.mode), productFilter(q)))
    .groupBy(accounts.code, accounts.name, accounts.class)
    .orderBy(asc(accounts.code));

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    class: r.class,
    debitMinor: BigInt(r.debit),
    creditMinor: BigInt(r.credit),
  }));
}

/** Totals split by product, for the product P&L. `null` is unattributed. */
export async function productAccountTotals(
  fiscalYear: string,
  mode: CredentialMode,
): Promise<{ productId: string | null; totals: AccountTotals[] }[]> {
  const rows = await db
    .select({
      productId: ledgerEntries.productId,
      code: accounts.code,
      name: accounts.name,
      class: accounts.class,
      debit,
      credit,
    })
    .from(ledgerEntries)
    .innerJoin(journalEntries, eq(journalEntries.id, ledgerEntries.journalId))
    .innerJoin(
      fiscalPeriods,
      eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
    )
    .innerJoin(accounts, eq(accounts.code, ledgerEntries.accountCode))
    .where(
      and(
        eq(fiscalPeriods.fiscalYear, fiscalYear),
        inMode(mode),
        sql`${accounts.class} IN ('revenue','direct_cost','expense')`,
      ),
    )
    .groupBy(
      ledgerEntries.productId,
      accounts.code,
      accounts.name,
      accounts.class,
    );

  const byProduct = new Map<string | null, AccountTotals[]>();
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? [];
    list.push({
      code: r.code,
      name: r.name,
      class: r.class,
      debitMinor: BigInt(r.debit),
      creditMinor: BigInt(r.credit),
    });
    byProduct.set(r.productId, list);
  }

  return [...byProduct.entries()].map(([productId, totals]) => ({
    productId,
    totals,
  }));
}

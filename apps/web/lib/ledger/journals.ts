/**
 * The journal browser: a page of journals, and one journal with its lines.
 */
import 'server-only';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

import {
  accounts,
  db,
  fiscalPeriods,
  journalEntries,
  ledgerEntries,
  products,
  type CredentialMode,
} from '@softmato/db';

import { inMode, journalMode } from './scope';

export const JOURNAL_SOURCES = [
  'payment',
  'refund',
  'invoice',
  'revenue_recognition',
  'settlement',
  'expense',
  'payroll',
  'manual',
  'reversal',
  'opening_balance',
  'period_close',
] as const;

export type JournalSource = (typeof JOURNAL_SOURCES)[number];

export const PAGE_SIZE = 50;

export interface JournalRow {
  id: number;
  journalNo: string;
  source: JournalSource;
  description: string;
  occurredAt: Date;
  periodNo: number;
  amountMinor: bigint;
}

export async function listJournals(q: {
  fiscalYear: string;
  mode: CredentialMode;
  source?: JournalSource | undefined;
  page: number;
}): Promise<{ rows: JournalRow[]; total: number }> {
  const where = and(
    eq(fiscalPeriods.fiscalYear, q.fiscalYear),
    inMode(q.mode),
    q.source ? eq(journalEntries.source, q.source) : undefined,
  );

  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: journalEntries.id,
        journalNo: journalEntries.journalNo,
        source: journalEntries.source,
        description: journalEntries.description,
        occurredAt: journalEntries.occurredAt,
        periodNo: fiscalPeriods.periodNo,
        amount: sql<string>`(SELECT coalesce(sum(le.amount_minor), 0) FROM ledger_entries le WHERE le.journal_id = ${journalEntries.id} AND le.direction = 'debit')`,
      })
      .from(journalEntries)
      .innerJoin(
        fiscalPeriods,
        eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
      )
      .where(where)
      .orderBy(desc(journalEntries.occurredAt), desc(journalEntries.id))
      .limit(PAGE_SIZE)
      .offset((q.page - 1) * PAGE_SIZE),
    db
      .select({ n: count() })
      .from(journalEntries)
      .innerJoin(
        fiscalPeriods,
        eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
      )
      .where(where),
  ]);

  return {
    rows: rows.map(({ amount, ...r }) => ({
      ...r,
      amountMinor: BigInt(amount),
    })),
    total: counted?.n ?? 0,
  };
}

export interface JournalLine {
  lineNo: number;
  accountCode: string;
  accountName: string;
  direction: 'debit' | 'credit';
  amountMinor: bigint;
  productName: string | null;
  memo: string | null;
}

export interface JournalDetail {
  id: number;
  journalNo: string;
  source: JournalSource;
  sourceTable: string | null;
  sourceId: string | null;
  description: string;
  occurredAt: Date;
  postedAt: Date;
  fiscalYear: string;
  periodNo: number;
  mode: CredentialMode;
  reversesJournalNo: string | null;
  reversedByJournalNo: string | null;
  lines: JournalLine[];
}

export async function journalDetail(
  journalNo: string,
): Promise<JournalDetail | null> {
  const [journal] = await db
    .select({
      id: journalEntries.id,
      journalNo: journalEntries.journalNo,
      source: journalEntries.source,
      sourceTable: journalEntries.sourceTable,
      sourceId: journalEntries.sourceId,
      description: journalEntries.description,
      occurredAt: journalEntries.occurredAt,
      postedAt: journalEntries.postedAt,
      fiscalYear: fiscalPeriods.fiscalYear,
      periodNo: fiscalPeriods.periodNo,
      mode: journalMode,
      reversesJournalNo: sql<
        string | null
      >`(SELECT j.journal_no FROM journal_entries j WHERE j.id = ${journalEntries.reversesJournalId})`,
      reversedByJournalNo: sql<
        string | null
      >`(SELECT j.journal_no FROM journal_entries j WHERE j.id = ${journalEntries.reversedByJournalId})`,
    })
    .from(journalEntries)
    .innerJoin(
      fiscalPeriods,
      eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
    )
    .where(eq(journalEntries.journalNo, journalNo))
    .limit(1);

  if (!journal) return null;

  const lines = await db
    .select({
      lineNo: ledgerEntries.lineNo,
      accountCode: ledgerEntries.accountCode,
      accountName: accounts.name,
      direction: ledgerEntries.direction,
      amountMinor: ledgerEntries.amountMinor,
      productName: products.name,
      memo: ledgerEntries.memo,
    })
    .from(ledgerEntries)
    .innerJoin(accounts, eq(accounts.code, ledgerEntries.accountCode))
    .leftJoin(products, eq(products.id, ledgerEntries.productId))
    .where(eq(ledgerEntries.journalId, journal.id))
    .orderBy(asc(ledgerEntries.lineNo));

  return { ...journal, lines };
}

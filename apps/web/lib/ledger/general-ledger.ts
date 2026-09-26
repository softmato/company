/** Every ledger line of a fiscal year, for the accountant's export. */
import 'server-only';
import { and, asc, eq } from 'drizzle-orm';

import {
  accounts,
  db,
  fiscalPeriods,
  journalEntries,
  ledgerEntries,
  type CredentialMode,
} from '@softmato/db';

import { inMode } from './scope';

export async function generalLedgerLines(
  fiscalYear: string,
  mode: CredentialMode,
) {
  return db
    .select({
      journalNo: journalEntries.journalNo,
      occurredAt: journalEntries.occurredAt,
      source: journalEntries.source,
      description: journalEntries.description,
      lineNo: ledgerEntries.lineNo,
      accountCode: ledgerEntries.accountCode,
      accountName: accounts.name,
      direction: ledgerEntries.direction,
      amountMinor: ledgerEntries.amountMinor,
      productId: ledgerEntries.productId,
      memo: ledgerEntries.memo,
    })
    .from(ledgerEntries)
    .innerJoin(journalEntries, eq(journalEntries.id, ledgerEntries.journalId))
    .innerJoin(
      fiscalPeriods,
      eq(fiscalPeriods.id, journalEntries.fiscalPeriodId),
    )
    .innerJoin(accounts, eq(accounts.code, ledgerEntries.accountCode))
    .where(and(eq(fiscalPeriods.fiscalYear, fiscalYear), inMode(mode)))
    .orderBy(
      asc(journalEntries.occurredAt),
      asc(journalEntries.id),
      asc(ledgerEntries.lineNo),
    );
}

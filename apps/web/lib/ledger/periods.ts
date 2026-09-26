/**
 * The twelve periods of a fiscal year and what has been posted into each.
 * Read only: closing a period is a decision for the founder and the
 * accountant, and the database already refuses postings into a closed one.
 */
import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';

import {
  db,
  fiscalPeriods,
  journalEntries,
  type CredentialMode,
} from '@softmato/db';

import { inMode } from './scope';

export interface PeriodRow {
  id: number;
  periodNo: number;
  startsAt: Date;
  endsAt: Date;
  status: 'open' | 'reconciliation_required' | 'closed' | 'locked';
  closedAt: Date | null;
  journals: number;
}

export async function periodsOf(
  fiscalYear: string,
  mode: CredentialMode,
): Promise<PeriodRow[]> {
  return db
    .select({
      id: fiscalPeriods.id,
      periodNo: fiscalPeriods.periodNo,
      startsAt: fiscalPeriods.startsAt,
      endsAt: fiscalPeriods.endsAt,
      status: fiscalPeriods.status,
      closedAt: fiscalPeriods.closedAt,
      journals: sql<number>`(SELECT count(*)::int FROM ${journalEntries} WHERE ${journalEntries.fiscalPeriodId} = ${fiscalPeriods.id} AND ${inMode(mode)})`,
    })
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.fiscalYear, fiscalYear))
    .orderBy(asc(fiscalPeriods.periodNo));
}

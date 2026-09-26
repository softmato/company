/**
 * Which journals a report may count: one fiscal year, one mode.
 *
 * **Journals carry no Sandbox/Production mark of their own.** Payments,
 * invoices and refunds do (`mode`), and a journal points back at the row that
 * caused it through `source_table`/`source_id`. So a journal's mode is its
 * source's mode, and a journal with no source — manual entries, opening
 * balances, period close — is the company's own bookkeeping, which is live.
 *
 * Every report filters on this, matching the admin's Sandbox/Production
 * switch (`lib/admin/mode.ts`): a test payment must never read as revenue.
 */
import 'server-only';
import { asc, sql, type SQL } from 'drizzle-orm';

import {
  db,
  fiscalPeriods,
  journalEntries,
  type CredentialMode,
} from '@softmato/db';

// ponytail: a reversal inherits 'live' unless it names a source row; none exist yet — resolve via reverses_journal_id when the first one is posted
export const journalMode: SQL<CredentialMode> = sql<CredentialMode>`(CASE
  WHEN ${journalEntries.sourceTable} = 'transactions' THEN
    (SELECT t.mode FROM transactions t WHERE t.id = ${journalEntries.sourceId}::bigint)
  WHEN ${journalEntries.sourceTable} = 'invoices' THEN
    (SELECT i.mode FROM invoices i WHERE i.id = ${journalEntries.sourceId}::bigint)
  WHEN ${journalEntries.sourceTable} = 'refunds' THEN
    (SELECT t.mode FROM refunds r JOIN transactions t ON t.id = r.transaction_id WHERE r.id = ${journalEntries.sourceId}::bigint)
  ELSE 'live'
END)::credential_mode`;

export function inMode(mode: CredentialMode): SQL {
  return sql`${journalMode} = ${mode}`;
}

/** `2082/83`. Test fixtures leave years like `TEST/00` behind; they are not years. */
const FISCAL_YEAR = /^\d{4}\/\d{2}$/;

export function isFiscalYear(value: string | undefined): value is string {
  return typeof value === 'string' && FISCAL_YEAR.test(value);
}

/** Every real fiscal year that has periods, newest first. */
export async function fiscalYears(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ fy: fiscalPeriods.fiscalYear })
    .from(fiscalPeriods)
    .orderBy(asc(fiscalPeriods.fiscalYear));

  return rows
    .map((r) => r.fy)
    .filter((fy) => FISCAL_YEAR.test(fy))
    .reverse();
}

/** The fiscal year today falls in, or the newest one there is. */
export async function currentFiscalYear(
  now = new Date(),
): Promise<string | null> {
  const [row] = await db
    .select({ fy: fiscalPeriods.fiscalYear })
    .from(fiscalPeriods)
    .where(
      sql`${fiscalPeriods.startsAt} <= ${now} AND ${fiscalPeriods.endsAt} > ${now} AND ${fiscalPeriods.fiscalYear} ~ '^[0-9]{4}/[0-9]{2}$'`,
    )
    .limit(1);

  return row?.fy ?? (await fiscalYears())[0] ?? null;
}

/** The fiscal year a page asked for, if it is real; otherwise the current one. */
export async function resolveFiscalYear(
  requested: string | undefined,
): Promise<string | null> {
  if (isFiscalYear(requested)) return requested;
  return currentFiscalYear();
}

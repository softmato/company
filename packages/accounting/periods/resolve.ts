/**
 * occurredAt → fiscal period.
 *
 * Resolution is by range lookup against the seeded `fiscal_periods` rows, never
 * computed from Gregorian months: BS boundaries do not align and BS month
 * lengths vary (docs/DATABASE.md §5).
 */
import { and, gt, lte } from 'drizzle-orm';
import { fiscalPeriods, type DbTx, type FiscalPeriod } from '@softmato/db';

import { AccountingError } from '../errors';

/**
 * `startsAt` is inclusive, `endsAt` exclusive — matching how the periods are
 * seeded. An instant on a boundary belongs to the later period, so no event can
 * land in two periods or in none.
 */
export async function resolveFiscalPeriod(
  tx: DbTx,
  occurredAt: Date,
): Promise<FiscalPeriod> {
  const matches = await tx
    .select()
    .from(fiscalPeriods)
    .where(
      and(
        lte(fiscalPeriods.startsAt, occurredAt),
        gt(fiscalPeriods.endsAt, occurredAt),
      ),
    )
    .limit(2);

  const period = matches[0];

  if (!period) {
    throw new AccountingError(
      'NO_FISCAL_PERIOD',
      `No fiscal period covers ${occurredAt.toISOString()}. Seed the BS year before posting.`,
      { occurredAt: occurredAt.toISOString() },
    );
  }

  /*
   * The comment above claims no event can land in two periods. Nothing in the
   * database enforced that, and a stray wide-ranged period — a test fixture
   * spanning 2000–2100, say — silently swallowed every real posting, because
   * `LIMIT 1` made the ambiguity invisible.
   *
   * Fail closed instead. A posting that could belong to two periods belongs to
   * neither until someone decides (docs/RULES.md §5).
   */
  if (matches.length > 1) {
    const second = matches[1]!;
    throw new AccountingError(
      'NO_FISCAL_PERIOD',
      `More than one fiscal period covers ${occurredAt.toISOString()}: ` +
        `${period.fiscalYear}/${period.periodNo} and ${second.fiscalYear}/${second.periodNo}. ` +
        'Fiscal periods must not overlap; fix the periods before posting.',
      {
        occurredAt: occurredAt.toISOString(),
        periods: [
          `${period.fiscalYear}/${period.periodNo}`,
          `${second.fiscalYear}/${second.periodNo}`,
        ],
      },
    );
  }

  return period;
}

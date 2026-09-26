import { Card } from '@/components/ui/card';
import type { BalanceSheet } from '@/lib/ledger/statements-math';

import { StatementTable } from './statement-table';

/**
 * Cumulative to the end of the chosen year. Profit not yet closed into
 * retained earnings is shown as its own line under equity rather than
 * hidden — until the first year-end close runs, that is all of it.
 */
export function BalanceSheetReport({
  bs,
  fiscalYear,
}: {
  bs: BalanceSheet;
  fiscalYear: string;
}) {
  const balanced = bs.differenceMinor === 0n;

  return (
    <div className="space-y-3">
      {!balanced ? (
        <p
          role="alert"
          className="rounded-md border border-flag/40 bg-flag/5 px-3 py-2 text-sm text-flag"
        >
          The balance sheet is out by {bs.differenceMinor.toString()} paisa. The
          ledger itself cannot be unbalanced, so a report query is wrong — do
          not rely on these figures.
        </p>
      ) : null}
      <Card>
        <StatementTable
          fiscalYear={fiscalYear}
          sections={[
            {
              title: 'Assets',
              lines: bs.assets,
              total: bs.assetTotal,
              totalLabel: 'Total assets',
            },
          ]}
          results={[]}
        />
        <StatementTable
          fiscalYear={fiscalYear}
          sections={[
            {
              title: 'Liabilities',
              lines: bs.liabilities,
              total: bs.liabilityTotal,
              totalLabel: 'Total liabilities',
            },
            {
              title: 'Equity',
              lines: [
                ...bs.equity,
                {
                  code: '—',
                  name: 'Profit not yet closed to retained earnings',
                  amountMinor: bs.unclosedEarnings,
                },
              ],
              total: bs.equityTotal + bs.unclosedEarnings,
              totalLabel: 'Total equity',
            },
          ]}
          results={[
            {
              label: 'Liabilities and equity',
              amountMinor:
                bs.liabilityTotal + bs.equityTotal + bs.unclosedEarnings,
              strong: true,
            },
          ]}
        />
      </Card>
    </div>
  );
}

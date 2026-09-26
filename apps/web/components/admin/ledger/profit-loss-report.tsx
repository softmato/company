import { Card } from '@/components/ui/card';
import type { ProfitAndLoss } from '@/lib/ledger/statements-math';

import { StatementTable } from './statement-table';

export function ProfitLossReport({
  pl,
  fiscalYear,
}: {
  pl: ProfitAndLoss;
  fiscalYear: string;
}) {
  return (
    <Card>
      <StatementTable
        fiscalYear={fiscalYear}
        sections={[
          {
            title: 'Revenue',
            lines: pl.revenue,
            total: pl.revenueTotal,
            totalLabel: 'Total revenue',
          },
          {
            title: 'Direct costs',
            lines: pl.directCosts,
            total: pl.directCostTotal,
            totalLabel: 'Total direct costs',
          },
        ]}
        results={[{ label: 'Gross profit', amountMinor: pl.grossProfit }]}
      />
      <StatementTable
        fiscalYear={fiscalYear}
        sections={[
          {
            title: 'Operating expenses',
            lines: pl.expenses,
            total: pl.expenseTotal,
            totalLabel: 'Total operating expenses',
          },
        ]}
        results={[
          { label: 'Net profit', amountMinor: pl.netProfit, strong: true },
        ]}
      />
    </Card>
  );
}

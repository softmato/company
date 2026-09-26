import { Card } from '@/components/ui/card';
import { DataTable, Td, Th, TotalRow, Tr } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { formatPaisa } from '@/lib/format/money';
import type { ProfitAndLoss } from '@/lib/ledger/statements-math';

export interface ProductColumn {
  label: string;
  pl: ProfitAndLoss;
}

/**
 * One column per product, plus lines with no product and the company total.
 * The last column is computed from the whole ledger, not by adding the
 * others, so a product column that went missing shows as a mismatch.
 */
export function ProductPlReport({
  columns,
  company,
}: {
  columns: ProductColumn[];
  company: ProfitAndLoss;
}) {
  const all = [...columns, { label: 'Company', pl: company }];
  const rows: {
    label: string;
    pick: (pl: ProfitAndLoss) => bigint;
    total?: boolean;
  }[] = [
    { label: 'Revenue', pick: (p) => p.revenueTotal },
    { label: 'Direct costs', pick: (p) => p.directCostTotal },
    { label: 'Gross profit', pick: (p) => p.grossProfit, total: true },
    { label: 'Operating expenses', pick: (p) => p.expenseTotal },
    { label: 'Net profit', pick: (p) => p.netProfit, total: true },
  ];

  const sum = columns.reduce((n, c) => n + c.pl.netProfit, 0n);
  const ties = sum === company.netProfit;

  return (
    <div className="space-y-3">
      <Card>
        <DataTable>
          <thead>
            <tr>
              <Th className="pt-3" />
              {all.map((c) => (
                <Th key={c.label} className="pt-3" numeric>
                  {c.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              r.total ? (
                <TotalRow key={r.label}>
                  <Td>{r.label}</Td>
                  {all.map((c) => (
                    <Td
                      key={c.label}
                      numeric
                      className={cn(r.pick(c.pl) < 0n && 'text-flag')}
                    >
                      {formatPaisa(r.pick(c.pl))}
                    </Td>
                  ))}
                </TotalRow>
              ) : (
                <Tr key={r.label}>
                  <Td>{r.label}</Td>
                  {all.map((c) => (
                    <Td key={c.label} numeric>
                      {formatPaisa(r.pick(c.pl))}
                    </Td>
                  ))}
                </Tr>
              ),
            )}
          </tbody>
        </DataTable>
      </Card>
      <p
        className={cn(
          'text-[13px]',
          ties ? 'text-muted-foreground' : 'text-flag',
        )}
      >
        {ties
          ? 'The product columns add up to the company total, to the paisa.'
          : `The product columns add up to ${formatPaisa(sum)}, not the company total — a report query is wrong.`}
      </p>
    </div>
  );
}

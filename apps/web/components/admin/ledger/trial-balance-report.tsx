import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, TotalRow, Tr } from '@/components/ui/table';
import { formatPaisa } from '@/lib/format/money';
import type { TrialBalance } from '@/lib/ledger/statements-math';

export function TrialBalanceReport({
  tb,
  fiscalYear,
}: {
  tb: TrialBalance;
  fiscalYear: string;
}) {
  if (tb.lines.length === 0) {
    return (
      <EmptyState
        title="Nothing posted this year"
        description="Accounts appear here once a journal posts to them in this fiscal year."
      />
    );
  }

  const balanced = tb.debitTotal === tb.creditTotal;

  return (
    <Card>
      <DataTable>
        <thead>
          <tr>
            <Th className="w-24 pt-3">Code</Th>
            <Th className="pt-3">Account</Th>
            <Th className="pt-3" numeric>
              Debit
            </Th>
            <Th className="pt-3" numeric>
              Credit
            </Th>
            <Th className="pt-3" numeric>
              Balance
            </Th>
          </tr>
        </thead>
        <tbody>
          {tb.lines.map((l) => (
            <Tr key={l.code}>
              <Td className="font-mono text-[13px]">
                <Link
                  href={`/admin/accounts/${l.code}?fy=${encodeURIComponent(fiscalYear)}`}
                  className="hover:text-primary hover:underline"
                >
                  {l.code}
                </Link>
              </Td>
              <Td>{l.name}</Td>
              <Td numeric>{formatPaisa(l.debitMinor)}</Td>
              <Td numeric>{formatPaisa(l.creditMinor)}</Td>
              <Td numeric>{formatPaisa(l.balanceMinor)}</Td>
            </Tr>
          ))}
          <TotalRow>
            <Td />
            <Td>
              {balanced ? 'Totals — balanced' : 'Totals — DO NOT BALANCE'}
            </Td>
            <Td numeric>{formatPaisa(tb.debitTotal)}</Td>
            <Td numeric>{formatPaisa(tb.creditTotal)}</Td>
            <Td numeric className={balanced ? undefined : 'text-flag'}>
              {formatPaisa(tb.debitTotal - tb.creditTotal)}
            </Td>
          </TotalRow>
        </tbody>
      </DataTable>
    </Card>
  );
}

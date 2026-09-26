/**
 * `/admin/accounts` — the chart of accounts with this year's movement on
 * each (Phase 7). Read only: accounts are seeded from
 * docs/CHART_OF_ACCOUNTS.md, and posted history is never edited.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { LedgerHeader } from '@/components/admin/ledger/ledger-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { adminMode } from '@/lib/admin/mode';
import { cn } from '@/lib/cn';
import { formatPaisa } from '@/lib/format/money';
import { chartOfAccounts } from '@/lib/ledger/accounts';
import { fiscalYears, resolveFiscalYear } from '@/lib/ledger/scope';
import type { AccountClass } from '@/lib/ledger/statements-math';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Chart of accounts' };

const CLASSES: { id: AccountClass; label: string }[] = [
  { id: 'asset', label: 'Assets' },
  { id: 'liability', label: 'Liabilities' },
  { id: 'equity', label: 'Equity' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'direct_cost', label: 'Direct costs' },
  { id: 'expense', label: 'Operating expenses' },
];

export default async function AccountsPage({
  searchParams,
}: PageProps<'/admin/accounts'>) {
  const params = await searchParams;
  const [mode, years, fiscalYear] = await Promise.all([
    adminMode(),
    fiscalYears(),
    resolveFiscalYear(params.fy as string | undefined),
  ]);

  if (!fiscalYear) {
    return (
      <EmptyState
        title="No fiscal periods"
        description="Run the seed to create the fiscal periods for the current year."
      />
    );
  }

  const chart = await chartOfAccounts(fiscalYear, mode);

  return (
    <div className="space-y-5">
      <LedgerHeader
        title="Chart of accounts"
        lead="Every account, with this year's debits, credits and balance in its normal direction. Open one for its ledger."
        mode={mode}
        years={years}
        fiscalYear={fiscalYear}
      />

      <Card>
        <DataTable dense>
          <thead>
            <tr>
              <Th className="w-24 pt-3">Code</Th>
              <Th className="pt-3">Account</Th>
              <Th className="pt-3" numeric>
                Debits
              </Th>
              <Th className="pt-3" numeric>
                Credits
              </Th>
              <Th className="pt-3" numeric>
                Balance
              </Th>
            </tr>
          </thead>
          {CLASSES.map((cls) => (
            <tbody key={cls.id}>
              <tr>
                <td
                  colSpan={5}
                  className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {cls.label}
                </td>
              </tr>
              {chart
                .filter((a) => a.class === cls.id)
                .map((a) => {
                  const quiet = a.debitMinor === 0n && a.creditMinor === 0n;
                  return (
                    <Tr
                      key={a.code}
                      className={cn(!a.isActive && 'opacity-50')}
                    >
                      <Td
                        className={cn(
                          'font-mono text-[13px]',
                          a.parentCode && 'pl-6',
                        )}
                      >
                        <Link
                          href={`/admin/accounts/${a.code}?fy=${encodeURIComponent(fiscalYear)}`}
                          className="hover:text-primary hover:underline"
                        >
                          {a.code}
                        </Link>
                      </Td>
                      <Td className={cn(!a.isPostable && 'font-medium')}>
                        {a.name}
                        {!a.isPostable ? (
                          <Badge tone="quiet" className="ml-2">
                            Header
                          </Badge>
                        ) : null}
                        {a.isContra ? (
                          <Badge tone="quiet" className="ml-2">
                            Contra
                          </Badge>
                        ) : null}
                        {!a.isActive ? (
                          <Badge tone="quiet" className="ml-2">
                            Inactive
                          </Badge>
                        ) : null}
                      </Td>
                      <Td
                        numeric
                        className={cn(quiet && 'text-muted-foreground')}
                      >
                        {formatPaisa(a.debitMinor)}
                      </Td>
                      <Td
                        numeric
                        className={cn(quiet && 'text-muted-foreground')}
                      >
                        {formatPaisa(a.creditMinor)}
                      </Td>
                      <Td
                        numeric
                        className={cn(
                          quiet && 'text-muted-foreground',
                          a.balanceMinor < 0n && 'text-flag',
                        )}
                      >
                        {formatPaisa(a.balanceMinor)}
                      </Td>
                    </Tr>
                  );
                })}
            </tbody>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

/**
 * `/admin/accounts/1020?fy=2083/84` — one account's general ledger: every
 * line posted to it in the year, with a running balance, each line linking
 * to its journal.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { LedgerHeader } from '@/components/admin/ledger/ledger-header';
import { BsDate } from '@/components/ui/bs-date';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, TotalRow, Tr } from '@/components/ui/table';
import { adminMode } from '@/lib/admin/mode';
import { formatPaisa } from '@/lib/format/money';
import { accountLedger } from '@/lib/ledger/accounts';
import { fiscalYears, resolveFiscalYear } from '@/lib/ledger/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Account ledger' };

export default async function AccountLedgerPage({
  params,
  searchParams,
}: PageProps<'/admin/accounts/[code]'>) {
  const { code } = await params;
  const query = await searchParams;
  const [mode, years, fiscalYear] = await Promise.all([
    adminMode(),
    fiscalYears(),
    resolveFiscalYear(query.fy as string | undefined),
  ]);

  const ledger =
    fiscalYear && /^\d{4}$/.test(code)
      ? await accountLedger(code, fiscalYear, mode)
      : null;
  if (!ledger || !fiscalYear) notFound();

  const { account, openingMinor, lines, closingMinor } = ledger;

  return (
    <div className="space-y-5">
      <Breadcrumbs
        trail={[
          {
            label: 'Chart of accounts',
            href: `/admin/accounts?fy=${encodeURIComponent(fiscalYear)}`,
          },
        ]}
      >
        <span className="font-mono">{account.code}</span>
      </Breadcrumbs>

      <LedgerHeader
        title={`${account.code} ${account.name}`}
        lead={`Balances are shown in the account's normal direction (${account.normalBalance}).`}
        mode={mode}
        years={years}
        fiscalYear={fiscalYear}
      />

      {lines.length === 0 && openingMinor === 0n ? (
        <EmptyState
          title="Nothing posted this year"
          description="Lines appear here as journals post to this account."
        />
      ) : (
        <Card>
          <DataTable dense>
            <thead>
              <tr>
                <Th className="pt-3">Date</Th>
                <Th className="pt-3">Journal</Th>
                <Th className="pt-3">Description</Th>
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
              <Tr>
                <Td />
                <Td />
                <Td className="text-muted-foreground">Brought forward</Td>
                <Td numeric />
                <Td numeric />
                <Td numeric>{formatPaisa(openingMinor)}</Td>
              </Tr>
              {lines.map((l, i) => (
                <Tr key={`${l.journalNo}-${i}`}>
                  <Td className="whitespace-nowrap text-[13px]">
                    <BsDate date={l.occurredAt} format="numeric" />
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[12.5px]">
                    <Link
                      href={`/admin/journals/${l.journalNo.split('/').map(encodeURIComponent).join('/')}`}
                      className="hover:text-primary hover:underline"
                    >
                      {l.journalNo}
                    </Link>
                  </Td>
                  <Td
                    className="max-w-[28rem] truncate text-[13px]"
                    title={l.memo ?? l.description}
                  >
                    {l.description}
                    {l.productName ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {l.productName}
                      </span>
                    ) : null}
                  </Td>
                  <Td numeric>
                    {l.debitMinor ? formatPaisa(l.debitMinor) : ''}
                  </Td>
                  <Td numeric>
                    {l.creditMinor ? formatPaisa(l.creditMinor) : ''}
                  </Td>
                  <Td numeric>{formatPaisa(l.runningMinor)}</Td>
                </Tr>
              ))}
              <TotalRow>
                <Td />
                <Td />
                <Td>Closing balance</Td>
                <Td numeric />
                <Td numeric />
                <Td numeric>{formatPaisa(closingMinor)}</Td>
              </TotalRow>
            </tbody>
          </DataTable>
        </Card>
      )}
    </div>
  );
}

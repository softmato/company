/**
 * `/admin/periods` — the twelve periods of a fiscal year and their status.
 *
 * Read only on purpose. The database already refuses postings into a closed
 * period (migration 0001, guarantee 3), which is exactly why closing one from
 * a button is not offered yet: a payment that settles after month end but is
 * dated inside it would then fail to post. The close procedure — cut-off,
 * reconciliation, year-end entries into 3100 — is the accountant's to define
 * (docs/CHART_OF_ACCOUNTS.md §11).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { LedgerHeader } from '@/components/admin/ledger/ledger-header';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { adminMode } from '@/lib/admin/mode';
import { formatAdDateTime } from '@/lib/format/date';
import { periodsOf, type PeriodRow } from '@/lib/ledger/periods';
import { fiscalYears, resolveFiscalYear } from '@/lib/ledger/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Periods' };

const MONTHS = [
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
  'Baisakh',
  'Jestha',
  'Ashadh',
];

const STATUS: Record<PeriodRow['status'], { label: string; tone: BadgeTone }> =
  {
    open: { label: 'Open', tone: 'credit' },
    reconciliation_required: { label: 'Needs reconciliation', tone: 'flag' },
    closed: { label: 'Closed', tone: 'quiet' },
    locked: { label: 'Locked', tone: 'quiet' },
  };

export default async function PeriodsPage({
  searchParams,
}: PageProps<'/admin/periods'>) {
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

  const periods = await periodsOf(fiscalYear, mode);
  const now = new Date();

  return (
    <div className="space-y-5">
      <LedgerHeader
        title="Periods"
        lead="A closed period accepts no new postings — the database enforces it. Closing is not offered here yet; the close procedure is the accountant's decision."
        mode={mode}
        years={years}
        fiscalYear={fiscalYear}
      />

      <Card>
        <DataTable>
          <thead>
            <tr>
              <Th className="pt-3">Period</Th>
              <Th className="pt-3">From</Th>
              <Th className="pt-3">To</Th>
              <Th className="pt-3">Status</Th>
              <Th className="pt-3" numeric>
                Journals
              </Th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const current = p.startsAt <= now && p.endsAt > now;
              return (
                <Tr key={p.id} className={current ? 'font-medium' : undefined}>
                  <Td>
                    <span className="font-mono text-[13px] text-muted-foreground">
                      P{p.periodNo}
                    </span>{' '}
                    {MONTHS[p.periodNo - 1]}
                    {current ? (
                      <Badge tone="primary" className="ml-2">
                        Current
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="text-[13px]">
                    <BsDate date={p.startsAt} />
                  </Td>
                  <Td className="text-[13px]">
                    <BsDate date={new Date(p.endsAt.getTime() - 1)} />
                  </Td>
                  <Td>
                    <Badge tone={STATUS[p.status].tone}>
                      {STATUS[p.status].label}
                    </Badge>
                    {p.closedAt ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatAdDateTime(p.closedAt)}
                      </span>
                    ) : null}
                  </Td>
                  <Td numeric>
                    {p.journals > 0 ? (
                      <Link
                        href={`/admin/journals?fy=${encodeURIComponent(fiscalYear)}`}
                        className="hover:text-primary hover:underline"
                      >
                        {p.journals}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}

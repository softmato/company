/**
 * `/admin/journals` — every journal in a fiscal year, newest first, with a
 * source filter (Phase 7: journal browser with drill-through).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { LedgerHeader } from '@/components/admin/ledger/ledger-header';
import { buttonClasses } from '@/components/ui/button';
import { BsDate } from '@/components/ui/bs-date';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { adminMode } from '@/lib/admin/mode';
import { cn } from '@/lib/cn';
import { formatPaisa } from '@/lib/format/money';
import {
  JOURNAL_SOURCES,
  PAGE_SIZE,
  listJournals,
  type JournalSource,
} from '@/lib/ledger/journals';
import { fiscalYears, resolveFiscalYear } from '@/lib/ledger/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Journals' };

const isSource = (v: unknown): v is JournalSource =>
  JOURNAL_SOURCES.includes(v as JournalSource);

export default async function JournalsPage({
  searchParams,
}: PageProps<'/admin/journals'>) {
  const params = await searchParams;
  const source = isSource(params.source) ? params.source : undefined;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
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

  const { rows, total } = await listJournals({
    fiscalYear,
    mode,
    source,
    page,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams({ fy: fiscalYear });
    const merged = { source, page, ...next };
    if (merged.source) q.set('source', String(merged.source));
    if (merged.page && Number(merged.page) > 1)
      q.set('page', String(merged.page));
    return `/admin/journals?${q}`;
  };

  return (
    <div className="space-y-5">
      <LedgerHeader
        title="Journals"
        lead={`${total.toLocaleString('en-IN')} journal${total === 1 ? '' : 's'} in ${fiscalYear}. Each is balanced by the database; open one for its lines.`}
        mode={mode}
        years={years}
        fiscalYear={fiscalYear}
        actions={
          <a
            href={`/api/admin/reports/journals?fy=${encodeURIComponent(fiscalYear)}`}
            className={buttonClasses('secondary', 'sm')}
            download
          >
            Export general ledger (CSV)
          </a>
        }
      />

      <nav
        aria-label="Source"
        className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {[undefined, ...JOURNAL_SOURCES].map((s) => (
          <Link
            key={s ?? 'all'}
            href={href({ source: s, page: 1 })}
            aria-current={s === source ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              s === source
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {(s ?? 'all').replace(/_/g, ' ')}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title="No journals"
          description="Nothing has posted in this year with this source."
        />
      ) : (
        <Card>
          <DataTable dense>
            <thead>
              <tr>
                <Th className="pt-3">Journal</Th>
                <Th className="pt-3">Date</Th>
                <Th className="pt-3">Source</Th>
                <Th className="pt-3">Description</Th>
                <Th className="pt-3" numeric>
                  Amount
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <Tr key={j.id}>
                  <Td className="whitespace-nowrap font-mono text-[12.5px]">
                    <Link
                      href={`/admin/journals/${j.journalNo.split('/').map(encodeURIComponent).join('/')}`}
                      className="hover:text-primary hover:underline"
                    >
                      {j.journalNo}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-[13px]">
                    <BsDate date={j.occurredAt} format="numeric" />
                  </Td>
                  <Td className="text-[13px] capitalize text-muted-foreground">
                    {j.source.replace(/_/g, ' ')}
                  </Td>
                  <Td
                    className="max-w-[30rem] truncate text-[13px]"
                    title={j.description}
                  >
                    {j.description}
                  </Td>
                  <Td numeric>{formatPaisa(j.amountMinor)}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={href({ page: page - 1 })}
                className={buttonClasses('secondary', 'sm')}
              >
                Newer
              </Link>
            ) : null}
            {page < pages ? (
              <Link
                href={href({ page: page + 1 })}
                className={buttonClasses('secondary', 'sm')}
              >
                Older
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

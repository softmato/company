/**
 * `/admin/journals/JE-2083/84-000012` — one journal and its lines. A catch-all
 * for the same reason as invoices: the number contains a slash.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { Card, CardBody } from '@/components/ui/card';
import { DataTable, Td, Th, TotalRow, Tr } from '@/components/ui/table';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';
import { journalDetail } from '@/lib/ledger/journals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Journal' };

function sourceLink(
  table: string | null,
  id: string | null,
): { label: string; href: string | null } | null {
  if (!table || !id) return null;
  if (table === 'invoices') return { label: `Invoice #${id}`, href: null };
  if (table === 'transactions')
    return { label: `Transaction #${id}`, href: null };
  if (table === 'refunds')
    return { label: `Refund #${id}`, href: '/admin/refunds' };
  return { label: `${table} #${id}`, href: null };
}

const encode = (no: string) => no.split('/').map(encodeURIComponent).join('/');

export default async function JournalPage({
  params,
}: PageProps<'/admin/journals/[...journalNo]'>) {
  const { journalNo: segments } = await params;
  const journal = await journalDetail(
    segments.map(decodeURIComponent).join('/'),
  );
  if (!journal) notFound();

  const debit = journal.lines
    .filter((l) => l.direction === 'debit')
    .reduce((n, l) => n + l.amountMinor, 0n);
  const credit = journal.lines
    .filter((l) => l.direction === 'credit')
    .reduce((n, l) => n + l.amountMinor, 0n);
  const source = sourceLink(journal.sourceTable, journal.sourceId);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        trail={[
          {
            label: 'Journals',
            href: `/admin/journals?fy=${encodeURIComponent(journal.fiscalYear)}`,
          },
        ]}
      >
        <span className="font-mono">{journal.journalNo}</span>
      </Breadcrumbs>

      <div>
        <h1 className="headline flex flex-wrap items-center gap-3 text-[30px] leading-tight">
          <span className="numeric">{journal.journalNo}</span>
          <Badge tone={journal.mode === 'live' ? 'primary' : 'neutral'}>
            {journal.mode === 'live' ? 'Production' : 'Sandbox'}
          </Badge>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {journal.description}
        </p>
      </div>

      <Card>
        <CardBody>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="eyebrow">Economic date</dt>
              <dd className="mt-1">
                <BsDate date={journal.occurredAt} format="full" />
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Period</dt>
              <dd className="mt-1 font-mono">
                {journal.fiscalYear} · P{journal.periodNo}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Source</dt>
              <dd className="mt-1 capitalize">
                {journal.source.replace(/_/g, ' ')}
                {source ? (
                  <span className="normal-case text-muted-foreground">
                    {' · '}
                    {source.href ? (
                      <Link href={source.href} className="hover:underline">
                        {source.label}
                      </Link>
                    ) : (
                      source.label
                    )}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Posted</dt>
              <dd className="mt-1">{formatAdDateTime(journal.postedAt)}</dd>
            </div>
          </dl>
          {journal.reversesJournalNo || journal.reversedByJournalNo ? (
            <p className="mt-4 border-t border-border pt-3 text-sm">
              {journal.reversesJournalNo ? (
                <>
                  Reverses{' '}
                  <Link
                    href={`/admin/journals/${encode(journal.reversesJournalNo)}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {journal.reversesJournalNo}
                  </Link>
                  .{' '}
                </>
              ) : null}
              {journal.reversedByJournalNo ? (
                <>
                  Reversed by{' '}
                  <Link
                    href={`/admin/journals/${encode(journal.reversedByJournalNo)}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {journal.reversedByJournalNo}
                  </Link>
                  .
                </>
              ) : null}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <DataTable>
          <thead>
            <tr>
              <Th className="w-12 pt-3">#</Th>
              <Th className="pt-3">Account</Th>
              <Th className="pt-3">Product</Th>
              <Th className="pt-3" numeric>
                Debit
              </Th>
              <Th className="pt-3" numeric>
                Credit
              </Th>
            </tr>
          </thead>
          <tbody>
            {journal.lines.map((l) => (
              <Tr key={l.lineNo}>
                <Td className="font-mono text-[13px] text-muted-foreground">
                  {l.lineNo}
                </Td>
                <Td>
                  <Link
                    href={`/admin/accounts/${l.accountCode}?fy=${encodeURIComponent(journal.fiscalYear)}`}
                    className="font-mono text-[13px] hover:text-primary hover:underline"
                  >
                    {l.accountCode}
                  </Link>{' '}
                  {l.accountName}
                  {l.memo ? (
                    <span className="block text-xs text-muted-foreground">
                      {l.memo}
                    </span>
                  ) : null}
                </Td>
                <Td className="text-[13px] text-muted-foreground">
                  {l.productName ?? '—'}
                </Td>
                <Td numeric>
                  {l.direction === 'debit' ? formatPaisa(l.amountMinor) : ''}
                </Td>
                <Td numeric>
                  {l.direction === 'credit' ? formatPaisa(l.amountMinor) : ''}
                </Td>
              </Tr>
            ))}
            <TotalRow>
              <Td />
              <Td>{debit === credit ? 'Balanced' : 'NOT BALANCED'}</Td>
              <Td />
              <Td numeric>{formatPaisa(debit)}</Td>
              <Td numeric>{formatPaisa(credit)}</Td>
            </TotalRow>
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}

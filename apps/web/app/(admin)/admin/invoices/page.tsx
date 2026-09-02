/**
 * `/admin/invoices` — the invoice ledger, from the database.
 *
 * Replaces a client component over a hardcoded `MOCK_INVOICES` array that also
 * carried an "issue invoice" form writing to React state.
 *
 * **No creation form here, deliberately.** Invoices are raised through
 * `POST /v1/invoices` or by the subscription billing run, both of which
 * allocate a gapless number inside the transaction that inserts the row
 * (docs/DATABASE.md §3). A form that posted to something else would be a
 * second numbering path, and the failure it produces — a hole in the sequence
 * an auditor asks about — surfaces months later. Manual issuance belongs in
 * Phase 6, built on the same allocator.
 */
import type { Metadata } from 'next';

import { StatusBadge } from '@/components/admin/status-badge';
import { TableFilters } from '@/components/admin/table-filters';
import { formatAd } from '@/lib/format/date';
import { formatNpr, formatPaisa } from '@/lib/format/money';
import {
  INVOICE_STATUSES,
  invoiceTotals,
  listInvoices,
  numberingGaps,
} from '@/lib/admin/invoices-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Invoices' };

export default async function AdminInvoicesPage({
  searchParams,
}: PageProps<'/admin/invoices'>) {
  const { status, q } = await searchParams;

  const [rows, totals, gaps] = await Promise.all([
    listInvoices({
      status: typeof status === 'string' ? status : undefined,
      query: typeof q === 'string' ? q : undefined,
    }),
    invoiceTotals(),
    numberingGaps(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raised through the API or the billing run. Numbers are gapless within
          a fiscal year.
        </p>
      </div>

      {/*
        Only rendered when something is actually wrong. A permanent "numbering
        healthy" panel is a thing people stop reading.
      */}
      {gaps.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            Invoice numbering has a gap.
          </p>
          <p className="mt-1 text-muted-foreground">
            {gaps
              .map(
                (gap) =>
                  `${gap.fiscalYear}: highest number ${gap.expected}, but ${gap.actual} invoices exist`,
              )
              .join('. ')}
            . A number was allocated and its invoice never committed. This is
            the thing an auditor asks about, so find it before year end.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Outstanding"
          value={formatNpr(totals.outstandingMinor)}
          note="Issued and partially paid, net of what has been received"
        />
        <Metric
          label="Received"
          value={formatNpr(totals.paidMinor)}
          note="Across every invoice"
        />
        <Metric
          label="Past due"
          value={String(totals.pastDueCount)}
          note={`${totals.draftCount} still in draft`}
          alarming={totals.pastDueCount > 0}
        />
      </div>

      <TableFilters
        statuses={INVOICE_STATUSES}
        searchPlaceholder="Invoice no, reference, customer…"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="numeric font-semibold text-foreground">
                      {invoice.invoiceNo}
                    </div>
                    {invoice.externalRef ? (
                      <div className="numeric text-[11px] text-muted-foreground">
                        {invoice.externalRef}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {invoice.customerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invoice.productName}
                  </td>
                  <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                    {formatPaisa(invoice.totalMinor)}
                  </td>
                  <td className="numeric px-4 py-3 text-right text-muted-foreground">
                    {formatPaisa(invoice.paidMinor)}
                  </td>
                  <td className="px-4 py-3">
                    {/*
                      `past_due` is derived, so it is shown alongside the stored
                      status rather than replacing it — the row really is still
                      `issued`, and an admin comparing this screen to the
                      database should not find them disagreeing.
                    */}
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={invoice.status} />
                      {invoice.pastDue ? (
                        <StatusBadge status="past_due" />
                      ) : null}
                    </div>
                  </td>
                  <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                    {invoice.dueAt ? formatAd(invoice.dueAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No invoices match this view.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  alarming = false,
}: {
  label: string;
  value: string;
  note: string;
  alarming?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-xs ${
        alarming ? 'border-amber-500/40' : 'border-border'
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="numeric mt-1 text-xl font-semibold text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

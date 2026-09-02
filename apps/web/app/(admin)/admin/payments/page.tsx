/**
 * `/admin/payments` — every payment attempt, from the database.
 *
 * The page this replaces was a client component over a hardcoded
 * `MOCK_PAYMENTS` array of five invented transactions. It looked complete, and
 * `todo.md` recorded it as done.
 */
import type { Metadata } from 'next';

import { StatusBadge } from '@/components/admin/status-badge';
import { TableFilters } from '@/components/admin/table-filters';
import { formatAdDateTime } from '@/lib/format/date';
import { formatNpr, formatPaisa } from '@/lib/format/money';
import {
  PAYMENT_STATUSES,
  listPayments,
  paymentTotals,
} from '@/lib/admin/payments-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Payments' };

export default async function AdminPaymentsPage({
  searchParams,
}: PageProps<'/admin/payments'>) {
  const { status, q } = await searchParams;

  const [payments, totals] = await Promise.all([
    listPayments({
      status: typeof status === 'string' ? status : undefined,
      query: typeof q === 'string' ? q : undefined,
    }),
    paymentTotals(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every attempt, settled or not. Amounts are what the provider
          confirmed, never what we expected.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Settled"
          value={formatNpr(totals.settledGrossMinor)}
          note={`${totals.settledCount} payment${totals.settledCount === 1 ? '' : 's'} · ${formatNpr(totals.settledFeeMinor)} in fees`}
        />
        <Metric
          label="In flight"
          value={String(totals.pendingCount)}
          note="Awaiting confirmation from a provider"
        />
        <Metric
          label="Held for review"
          value={String(totals.flaggedCount)}
          note="Amount mismatches. Never auto-resolved."
          alarming={totals.flaggedCount > 0}
        />
      </div>

      <TableFilters
        statuses={PAYMENT_STATUSES}
        searchPlaceholder="Txn no, provider ref, invoice, customer…"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="numeric font-semibold text-foreground">
                      {payment.txnNo}
                    </div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {payment.invoiceNo}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{payment.customerName}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold uppercase text-primary">
                      {payment.providerId}
                    </div>
                    <div className="numeric max-w-[14rem] truncate text-[11px] text-muted-foreground">
                      {payment.providerTxnId ?? payment.providerRef ?? '—'}
                    </div>
                  </td>
                  <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                    {formatPaisa(payment.grossAmountMinor)}
                  </td>
                  <td className="numeric px-4 py-3 text-right text-muted-foreground">
                    {/*
                      Blank rather than 0.00 until a provider has reported one.
                      A fee of zero and a fee not yet known are different facts,
                      and the fee is never computed (RULES.md §2.7).
                    */}
                    {payment.status === 'succeeded'
                      ? formatPaisa(payment.providerFeeMinor)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                    {payment.journalNo ?? '—'}
                  </td>
                  <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                    {formatAdDateTime(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No payments match this view.
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
      <p className="numeric mt-1 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

/**
 * `/admin/cash` — cash an integrator's staff filed, waiting for a second person.
 *
 * Each row is a claim (`packages/payment-core/offline/cash.ts`): nothing is
 * booked and no receipt exists until it is confirmed here, against the money
 * actually handed over or deposited. Confirm and reject each ask for the
 * password and an authenticator code.
 */
import type { Metadata } from 'next';

import { adminMode } from '@/lib/admin/mode';
import { listCash, type CashRow } from '@/lib/admin/cash-queries';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';

import { confirmCashAction, rejectCashAction } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Cash to confirm' };

const INPUT = 'h-8 rounded-md border border-border bg-background px-2 text-xs';

export default async function AdminCashPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const mode = await adminMode();
  const [{ message }, waiting, decided] = await Promise.all([
    searchParams,
    listCash(mode, ['pending']),
    listCash(mode, ['succeeded', 'failed'], 20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Cash to confirm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash an integrator&rsquo;s staff took. Confirm only against money you
          have actually received — confirming books it and emails the receipt.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{message}</p>
      ) : null}

      <div className="space-y-3">
        {waiting.map((row) => (
          <CashCard key={row.txnNo} row={row} />
        ))}
        {waiting.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No cash is waiting for confirmation.
          </p>
        ) : null}
      </div>

      {decided.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Taken by</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {decided.map((row) => (
                <tr key={row.txnNo}>
                  <td className="numeric px-4 py-3 font-semibold text-foreground">{row.txnNo}</td>
                  <td className="px-4 py-3 text-foreground">{row.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.collectedBy}</td>
                  <td className="numeric px-4 py-3 text-right text-foreground">
                    {row.currency} {formatPaisa(row.amountMinor)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.status === 'failed' ? (row.failureReason ?? 'Rejected') : 'Confirmed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function CashCard({ row }: { row: CashRow }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="numeric text-sm font-semibold text-foreground">
            {row.currency} {formatPaisa(row.amountMinor)} · {row.customerName}
          </p>
          <p className="numeric mt-0.5 text-[11px] text-muted-foreground">
            {row.txnNo} against {row.invoiceNo}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Taken by <strong className="text-foreground">{row.collectedBy}</strong>
          {row.collectedAt ? ` · ${formatAdDateTime(new Date(row.collectedAt))}` : ''}
          {row.reference ? ` · slip ${row.reference}` : ''}
        </p>
      </div>
      {row.note ? <p className="mt-2 text-xs text-muted-foreground">{row.note}</p> : null}

      <div className="mt-3 flex flex-wrap gap-4">
        <form action={confirmCashAction} className="flex flex-wrap items-center gap-2">
          <input name="txnNo" type="hidden" value={row.txnNo} />
          <input autoComplete="current-password" className={INPUT} name="password" placeholder="Password" required type="password" />
          <input autoComplete="one-time-code" className={`${INPUT} w-24`} inputMode="numeric" name="code" placeholder="Code" required />
          <button className="h-8 rounded-md bg-foreground px-3 text-xs font-semibold text-background" type="submit">
            Confirm received
          </button>
        </form>
        <form action={rejectCashAction} className="flex flex-wrap items-center gap-2">
          <input name="txnNo" type="hidden" value={row.txnNo} />
          <input className={`${INPUT} w-44`} name="reason" placeholder="Why it is rejected" required />
          <input autoComplete="current-password" className={INPUT} name="password" placeholder="Password" required type="password" />
          <input autoComplete="one-time-code" className={`${INPUT} w-24`} inputMode="numeric" name="code" placeholder="Code" required />
          <button className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground" type="submit">
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

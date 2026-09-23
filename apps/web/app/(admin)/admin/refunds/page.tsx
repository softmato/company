/**
 * `/admin/refunds` — refund requests raised through the API.
 *
 * No adapter can execute a refund, so the money goes back through the
 * provider's own merchant app and "Record refund" books what happened there
 * and emails the customer (`recordRefundAction`).
 */
import type { Metadata } from 'next';

import { RecordRefundDialog } from '@/components/admin/record-refund-dialog';
import { ProviderBadge } from '@/components/brand/provider-badge';
import { StatusBadge } from '@/components/admin/status-badge';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';
import { adminMode } from '@/lib/admin/mode';
import { listRefunds } from '@/lib/admin/refunds-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Refunds' };

/** Paisa → "12.00", for the amount field; `formatPaisa` adds commas. */
function rupees(minor: bigint): string {
  return `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
}

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const mode = await adminMode();
  const [{ message }, rows] = await Promise.all([
    searchParams,
    listRefunds(mode),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests raised through the API. A SaaS can never approve its own
          refund.
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        No provider can execute a refund from here. Send it from the
        provider&rsquo;s merchant app first, then{' '}
        <strong className="text-foreground">Record refund</strong> books it and
        emails the customer the reference.
      </p>

      {message ? (
        <p className="rounded-lg border border-border bg-card p-3 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((refund) => (
                <tr
                  key={refund.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="numeric font-semibold text-foreground">
                      {refund.refundNo}
                    </div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {refund.txnNo}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {refund.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <ProviderBadge id={refund.providerId} />
                  </td>
                  <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                    {refund.currency} {formatPaisa(refund.amountMinor)}
                  </td>
                  <td className="max-w-[18rem] px-4 py-3 text-muted-foreground">
                    {refund.reason}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={refund.status} />
                  </td>
                  <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                    {formatAdDateTime(refund.requestedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {refund.status === 'requested' ? (
                      <RecordRefundDialog
                        refundNo={refund.refundNo}
                        txnNo={refund.txnNo}
                        providerName={refund.providerName}
                        amount={rupees(refund.amountMinor)}
                      />
                    ) : refund.providerRefundId ? (
                      <span className="numeric text-[11px] text-muted-foreground">
                        Ref {refund.providerRefundId}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No refund has been requested.
          </p>
        ) : null}
      </div>
    </div>
  );
}

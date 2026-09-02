/**
 * `/admin/refunds` — refund requests, read-only.
 *
 * Replaces a client component over a hardcoded `MOCK_REFUNDS` array with an
 * approve/reject modal wired to `setState`. Pressing approve there changed a
 * colour and nothing else, which is a worse failure than a missing button:
 * somebody would have believed a refund had been issued.
 *
 * Two things have to exist before approval can. Both are shown on the page,
 * so the gap is legible rather than looking like an unfinished screen.
 */
import type { Metadata } from 'next';

import { StatusBadge } from '@/components/admin/status-badge';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';
import { listRefunds } from '@/lib/admin/refunds-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Refunds' };

export default async function AdminRefundsPage() {
  const rows = await listRefunds();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests raised through the API. A SaaS can never approve its own
          refund.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">
          Refunds cannot be approved yet, and this screen deliberately offers no
          button.
        </p>
        <ul className="mt-2 space-y-1.5 leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">No provider can execute one.</strong>{' '}
            The adapters&rsquo; <code className="font-mono">refund()</code> methods
            were removed — two of them reported success without contacting the
            provider at all, which would have posted reversing entries for money
            that never went back.
          </li>
          <li>
            <strong className="text-foreground">
              Approval needs a second person.
            </strong>{' '}
            The <code className="font-mono">refund_needs_second_person</code>{' '}
            constraint requires the approver to differ from the requester, and
            there is currently one admin. That is a decision for the founder,
            recorded in <code className="font-mono">docs/MEMORY.md</code>, not
            something to design around.
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Until both are settled, a refund is issued in the provider&rsquo;s own
          merchant dashboard and recorded here afterwards.
        </p>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((refund) => (
                <tr key={refund.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="numeric font-semibold text-foreground">
                      {refund.refundNo}
                    </div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {refund.txnNo}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{refund.customerName}</td>
                  <td className="px-4 py-3 font-semibold uppercase text-primary">
                    {refund.providerId}
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

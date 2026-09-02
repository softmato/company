/**
 * `/admin/reconciliation` — payments a person has to decide about.
 *
 * Replaces a client component over a hardcoded `MOCK_RECONCILIATION` array
 * whose rows had "Accept provider amount" and "Resolve" buttons wired to
 * `setState`.
 *
 * **There are no resolve controls on this page.** That is not an omission
 * pending a later commit; it is the rule. A held payment means the provider
 * and our records disagree about how much money moved, and resolving it means
 * either posting a journal for an amount nobody has verified or writing off
 * one that may have arrived. RULES.md §2.8: never auto-resolve — and a button
 * labelled "Accept provider amount" is auto-resolution with a human's finger
 * on it, since the human is given nothing to check.
 *
 * Resolution needs the provider's own event payload, the bank statement, and a
 * reversing-entry path that does not exist before Phase 7. Until then this
 * screen's job is to make sure nothing sits here unnoticed.
 */
import type { Metadata } from 'next';

import { StatusBadge } from '@/components/admin/status-badge';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';
import {
  hasEverRun,
  heldPayments,
  openRunItems,
} from '@/lib/admin/reconciliation-queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Reconciliation' };

export default async function AdminReconciliationPage() {
  const [held, runItems, everRun] = await Promise.all([
    heldPayments(),
    openRunItems(),
    hasEverRun(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="headline text-[30px] leading-tight">Reconciliation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Money that does not add up. Nothing here resolves itself, and nothing
          here is resolved from this screen.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-foreground">
            Held at settlement
          </h2>
          <p className="text-xs text-muted-foreground">
            {held.length} payment{held.length === 1 ? '' : 's'}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          A provider reported an amount that did not match the invoice. Nothing
          was posted to the ledger and the invoice was not cleared. The
          provider&rsquo;s own figure is in <code className="font-mono">provider_events</code>{' '}
          — read it there, against the bank statement, before deciding anything.
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 text-right">We expected</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Flagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {held.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="numeric font-semibold text-foreground">
                        {row.txnNo}
                      </div>
                      <div className="numeric text-[11px] text-muted-foreground">
                        {row.invoiceNo}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.customerName}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold uppercase text-primary">
                        {row.providerId}
                      </div>
                      <div className="numeric max-w-[12rem] truncate text-[11px] text-muted-foreground">
                        {row.providerRef ?? '—'}
                      </div>
                    </td>
                    <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                      {row.currency} {formatPaisa(row.expectedMinor)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.failureReason ?? 'Amount mismatch'}
                    </td>
                    <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                      {formatAdDateTime(row.flaggedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {held.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No payments are held for review.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-foreground">
            Provider statement runs
          </h2>
          <p className="text-xs text-muted-foreground">
            {runItems.length} open item{runItems.length === 1 ? '' : 's'}
          </p>
        </div>

        {/*
          The distinction that matters: an empty list because nothing is wrong,
          versus an empty list because nothing has looked. Saying which is the
          entire value of this panel.
        */}
        {!everRun ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">
              No reconciliation run has ever happened.
            </p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              An empty list here means nothing has been checked — not that
              everything matches. The <code className="font-mono">reconcile-providers</code>{' '}
              job compares our totals against each provider&rsquo;s statement and
              is Phase 7 work.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Provider ref</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3 text-right">Ours</th>
                    <th className="px-4 py-3 text-right">Theirs</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/30">
                      <td className="numeric px-4 py-3 text-foreground">
                        {item.providerRef ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold uppercase text-primary">
                        {item.providerId}
                      </td>
                      <td className="numeric px-4 py-3 text-right text-foreground">
                        {item.internalMinor === null
                          ? '—'
                          : formatPaisa(item.internalMinor)}
                      </td>
                      <td className="numeric px-4 py-3 text-right text-foreground">
                        {item.providerMinor === null
                          ? '—'
                          : formatPaisa(item.providerMinor)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {runItems.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Every item from the last run matched.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

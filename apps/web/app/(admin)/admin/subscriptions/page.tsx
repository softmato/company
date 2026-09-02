/**
 * `/admin/subscriptions` — real rows, but nothing that manages them yet.
 *
 * Replaces a client component over a hardcoded `MOCK_SUBSCRIPTIONS` array with
 * suspend and grace-extension controls wired to `setState`. Those controls
 * were the problem: subscription lifecycle is Phase 6 — renewal invoicing,
 * dunning at 7/3/1 days, grace, suspension, and deferred revenue recognition
 * — and none of it exists. A suspend button with no billing engine behind it
 * changes a colour and lets someone believe a customer was cut off.
 *
 * So this lists what the table actually holds and says plainly what is
 * missing. The table is empty until Phase 6 creates rows, and an empty list
 * with no explanation would read as "no subscriptions" rather than "this is
 * not built".
 */
import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';

import { customers, db, products, subscriptions } from '@softmato/db';

import { StatusBadge } from '@/components/admin/status-badge';
import { formatAd } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Subscriptions' };

export default async function AdminSubscriptionsPage() {
  const rows = await db
    .select({
      id: subscriptions.id,
      customerName: customers.name,
      productName: products.name,
      status: subscriptions.status,
      amountMinor: subscriptions.amountMinor,
      currency: subscriptions.currency,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline text-[30px] leading-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recurring billing. The schema exists; the billing engine does not.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">
          Subscription lifecycle is Phase 6 and is not built.
        </p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Renewal invoicing, dunning at 7/3/1 days, grace periods, suspension
          and monthly revenue recognition all remain. This screen is read-only
          until they exist — controls that changed a status without a billing
          run behind them would let someone believe a customer had been
          suspended or renewed when nothing had happened.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-foreground">
                    {row.customerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.productName}
                  </td>
                  <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                    {row.currency} {formatPaisa(row.amountMinor)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="numeric px-4 py-3 text-[11px] text-muted-foreground">
                    {formatAd(row.currentPeriodEnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No subscriptions exist yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

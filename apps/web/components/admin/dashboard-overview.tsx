import type { DashboardSnapshot } from '@/lib/admin/dashboard-model';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Money } from '@/components/ui/money';
import { StatTile } from '@/components/ui/stat-tile';

export function DashboardOverview({ data }: { data: DashboardSnapshot }) {
  const maxMonth = data.revenueByMonth.reduce(
    (max, month) => Math.max(max, Number(BigInt(month.totalMinor))),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ledger status"
          value={data.ledger.unbalancedCount === 0 ? 'Balanced' : 'Review'}
          alert={data.ledger.unbalancedCount > 0}
          note={
            data.ledger.unbalancedCount === 0
              ? 'Every journal balances.'
              : `${data.ledger.unbalancedCount} journal${data.ledger.unbalancedCount === 1 ? '' : 's'} need attention.`
          }
        />
        <StatTile
          label="Collected this month"
          value={<Money minor={BigInt(data.metrics.collectedMinor)} unit />}
          note="Gross confirmed payments, including refunded transactions."
        />
        <StatTile
          label="Pending payments"
          value={data.metrics.pendingPayments}
          note="Waiting for gateway confirmation."
        />
        <StatTile
          label="Overdue invoices"
          value={data.metrics.overdueInvoices}
          alert={data.metrics.overdueInvoices > 0}
          note="Issued invoices past their due date."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Collections</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Confirmed gross payments over the last six months.
              </p>
            </div>
            <span className="eyebrow">NPR</span>
          </CardHeader>
          <CardBody>
            {maxMonth === 0 ? (
              <EmptyState
                title="No collections yet"
                description="Confirmed payments will appear here once a gateway is live."
              />
            ) : (
              <div className="grid h-56 grid-cols-6 items-end gap-2 sm:gap-4">
                {data.revenueByMonth.map((month) => {
                  const amountMinor = BigInt(month.totalMinor);
                  const height =
                    amountMinor === 0n
                      ? 4
                      : Math.max(10, (Number(amountMinor) / maxMonth) * 100);

                  return (
                    <div
                      key={month.key}
                      className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                    >
                      <span className="numeric max-w-full truncate text-[10px] text-muted-foreground">
                        {amountMinor === 0n ? (
                          '—'
                        ) : (
                          <Money minor={amountMinor} />
                        )}
                      </span>
                      <div
                        role="img"
                        aria-label={`${month.label}: ${amountMinor === 0n ? 'no collections' : `${month.totalMinor} paisa`}`}
                        className="w-full rounded-t-sm bg-primary/75"
                        style={{ height: `${height}%` }}
                      />
                      <span className="numeric text-[11px] text-muted-foreground">
                        {month.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <span className="eyebrow">This month</span>
          </CardHeader>
          <CardBody>
            {data.paymentMethods.length === 0 ? (
              <EmptyState
                title="No confirmed payments"
                description="The split will appear when payments are settled."
              />
            ) : (
              <ul className="space-y-4">
                {data.paymentMethods.map((method) => (
                  <li key={method.provider}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">
                        {method.providerName}
                      </span>
                      <Money minor={BigInt(method.totalMinor)} />
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(4, (Number(BigInt(method.totalMinor)) / Math.max(1, Number(BigInt(data.metrics.collectedMinor)))) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {method.count} payment{method.count === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

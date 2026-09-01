import type { DashboardSnapshot } from '@/lib/admin/dashboard-model';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export function DashboardOperations({
  data,
  onReviewPayments,
  onReviewInvoices,
}: {
  data: DashboardSnapshot;
  onReviewPayments: () => void;
  onReviewInvoices: () => void;
}) {
  const checks = [
    {
      label: 'Ledger integrity',
      value: data.ledger.unbalancedCount === 0 ? 'Healthy' : 'Action required',
      status: data.ledger.unbalancedCount === 0 ? 'succeeded' : 'overdue',
      detail:
        data.ledger.unbalancedCount === 0
          ? 'No unbalanced journals were found.'
          : `${data.ledger.unbalancedCount} journal${data.ledger.unbalancedCount === 1 ? '' : 's'} are unbalanced.`,
    },
    {
      label: 'Payment reconciliation',
      value:
        data.metrics.reconciliationRequired === 0
          ? 'Clear'
          : `${data.metrics.reconciliationRequired} flagged`,
      status:
        data.metrics.reconciliationRequired === 0 ? 'succeeded' : 'overdue',
      detail:
        data.metrics.reconciliationRequired === 0
          ? 'No provider amount mismatches are waiting for review.'
          : 'A provider amount did not match the expected amount.',
    },
    {
      label: 'Invoice collection',
      value:
        data.metrics.overdueInvoices === 0
          ? 'On track'
          : `${data.metrics.overdueInvoices} overdue`,
      status: data.metrics.overdueInvoices === 0 ? 'succeeded' : 'overdue',
      detail:
        data.metrics.overdueInvoices === 0
          ? 'There are no issued invoices past their due date.'
          : 'Review overdue invoices before following up with customers.',
    },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Operational checks</CardTitle>
          <span className="eyebrow">Live</span>
        </CardHeader>
        <CardBody className="divide-y divide-border p-0">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {check.detail}
                </p>
              </div>
              <Badge status={check.status}>{check.value}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next actions</CardTitle>
        </CardHeader>
        <CardBody>
          {data.metrics.reconciliationRequired > 0 ||
          data.metrics.overdueInvoices > 0 ? (
            <ul className="space-y-3 text-sm">
              {data.metrics.reconciliationRequired > 0 ? (
                <li>
                  <button
                    type="button"
                    onClick={onReviewPayments}
                    className="text-primary underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    Review reconciliation flags →
                  </button>
                </li>
              ) : null}
              {data.metrics.overdueInvoices > 0 ? (
                <li>
                  <button
                    type="button"
                    onClick={onReviewInvoices}
                    className="text-primary underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    Review {data.metrics.overdueInvoices} overdue invoice
                    {data.metrics.overdueInvoices === 1 ? '' : 's'} →
                  </button>
                </li>
              ) : null}
            </ul>
          ) : (
            <EmptyState
              title="Nothing needs attention"
              description="The ledger, payments and invoice checks are clear."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

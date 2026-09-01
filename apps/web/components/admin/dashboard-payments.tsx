import {
  filterDashboardPayments,
  type DashboardPaymentFilter,
  type DashboardSnapshot,
} from '@/lib/admin/dashboard-model';
import { Badge } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Money } from '@/components/ui/money';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';

const FILTERS: Array<{ value: DashboardPaymentFilter; label: string }> = [
  { value: 'all', label: 'All recent' },
  { value: 'pending', label: 'Pending' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'succeeded', label: 'Confirmed' },
];

export function DashboardPayments({
  data,
  filter,
  onFilterChange,
}: {
  data: DashboardSnapshot;
  filter: DashboardPaymentFilter;
  onFilterChange: (filter: DashboardPaymentFilter) => void;
}) {
  const payments = filterDashboardPayments(data, filter);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent payments</CardTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The latest gateway attempts, newest first.
          </p>
        </div>
        <span className="eyebrow">{payments.length} shown</span>
      </CardHeader>

      <div
        role="group"
        aria-label="Filter payments"
        className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
            className={
              filter === option.value
                ? 'shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-[13px] font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                : 'shrink-0 rounded-md bg-muted px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {payments.length === 0 ? (
        <CardBody>
          <EmptyState
            title={
              filter === 'all'
                ? 'No payments yet'
                : 'No payments match this filter'
            }
            description={
              filter === 'all'
                ? 'Transactions will appear here when a customer starts checkout.'
                : 'Choose another filter to return to the latest payment attempts.'
            }
          />
        </CardBody>
      ) : (
        <DataTable dense>
          <thead>
            <tr>
              <Th>Transaction</Th>
              <Th>Customer</Th>
              <Th>Provider</Th>
              <Th>Status</Th>
              <Th numeric>Amount (NPR)</Th>
              <Th>When</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <Tr key={payment.id}>
                <Td className="font-mono text-[13px]">{payment.txnNo}</Td>
                <Td>{payment.customerName}</Td>
                <Td className="text-muted-foreground">
                  {payment.providerName}
                </Td>
                <Td>
                  <Badge status={payment.status}>{payment.status}</Badge>
                </Td>
                <Td numeric>
                  <Money minor={BigInt(payment.grossAmountMinor)} />
                </Td>
                <Td className="text-muted-foreground">
                  <BsDate date={new Date(payment.createdAt)} format="numeric" />
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}

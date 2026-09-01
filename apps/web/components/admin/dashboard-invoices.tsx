import type { DashboardSnapshot } from '@/lib/admin/dashboard-model';
import { Badge } from '@/components/ui/badge';
import { BsDate } from '@/components/ui/bs-date';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Money } from '@/components/ui/money';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';

export function DashboardInvoices({ data }: { data: DashboardSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Overdue invoices</CardTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Issued invoices that are past their due date, oldest first.
          </p>
        </div>
        <span className="eyebrow">{data.overdueInvoiceRows.length} shown</span>
      </CardHeader>

      {data.overdueInvoiceRows.length === 0 ? (
        <CardBody>
          <EmptyState
            title="No overdue invoices"
            description="Issued invoices past their due date will appear here for follow-up."
          />
        </CardBody>
      ) : (
        <DataTable dense>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th numeric>Outstanding (NPR)</Th>
            </tr>
          </thead>
          <tbody>
            {data.overdueInvoiceRows.map((invoice) => (
              <Tr key={invoice.id}>
                <Td className="font-mono text-[13px]">{invoice.invoiceNo}</Td>
                <Td>{invoice.customerName}</Td>
                <Td>
                  <Badge status={invoice.status}>
                    {invoice.status.replace('_', ' ')}
                  </Badge>
                </Td>
                <Td className="text-muted-foreground">
                  <BsDate date={new Date(invoice.dueAt)} format="numeric" />
                </Td>
                <Td numeric>
                  <Money minor={BigInt(invoice.remainingMinor)} tone="flag" />
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}

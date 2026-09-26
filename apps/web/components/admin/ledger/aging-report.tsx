import Link from 'next/link';

import { BsDate } from '@/components/ui/bs-date';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { formatPaisa } from '@/lib/format/money';
import {
  AGING_BUCKETS,
  type AgingBucket,
  type AgingRow,
} from '@/lib/ledger/aging';

export function AgingReport({
  rows,
  totals,
}: {
  rows: AgingRow[];
  totals: Record<AgingBucket, bigint>;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-5">
        {AGING_BUCKETS.map((b) => (
          <div
            key={b}
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-card"
          >
            <dt className="eyebrow">{b}</dt>
            <dd
              className={`mt-1.5 font-mono text-[18px] tabular-nums ${b === 'Over 90 days' && totals[b] > 0n ? 'text-flag' : ''}`}
            >
              {formatPaisa(totals[b])}
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <EmptyState
          title="Nobody owes anything"
          description="Issued invoices with a balance left to pay appear here, oldest due date first."
        />
      ) : (
        <Card>
          <DataTable>
            <thead>
              <tr>
                <Th className="pt-3">Invoice</Th>
                <Th className="pt-3">Customer</Th>
                <Th className="pt-3">Product</Th>
                <Th className="pt-3">Due</Th>
                <Th className="pt-3">Age</Th>
                <Th className="pt-3" numeric>
                  Owed (NPR)
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.invoiceNo}>
                  <Td className="font-mono text-[13px]">
                    <Link
                      href={`/admin/invoices/${r.invoiceNo.split('/').map(encodeURIComponent).join('/')}`}
                      className="hover:text-primary hover:underline"
                    >
                      {r.invoiceNo}
                    </Link>
                  </Td>
                  <Td>{r.customerName}</Td>
                  <Td className="text-muted-foreground">{r.productName}</Td>
                  <Td className="text-[13px]">
                    {r.dueAt ? <BsDate date={r.dueAt} format="numeric" /> : '—'}
                  </Td>
                  <Td className="text-[13px] text-muted-foreground">
                    {r.bucket}
                  </Td>
                  <Td numeric>{formatPaisa(r.balanceMinor)}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}
    </div>
  );
}

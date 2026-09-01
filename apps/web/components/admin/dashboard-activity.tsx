import Link from 'next/link';

import type { DashboardSnapshot } from '@/lib/admin/dashboard-model';
import { BsDate } from '@/components/ui/bs-date';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';

export function DashboardActivity({ data }: { data: DashboardSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <Link
          href="/admin/audit"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Full audit log
        </Link>
      </CardHeader>
      {data.activity.length === 0 ? (
        <CardBody>
          <EmptyState
            title="Nothing has happened yet"
            description="Publishing content, saving a setting or processing a payment is recorded here."
          />
        </CardBody>
      ) : (
        <DataTable dense>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Action</Th>
              <Th>Resource</Th>
              <Th>Actor</Th>
            </tr>
          </thead>
          <tbody>
            {data.activity.map((entry) => (
              <Tr key={entry.id}>
                <Td>
                  <BsDate date={new Date(entry.occurredAt)} format="numeric" />
                </Td>
                <Td className="font-mono text-[13px]">{entry.action}</Td>
                <Td className="text-muted-foreground">
                  {entry.resourceType}
                  {entry.resourceId ? ` · ${entry.resourceId}` : ''}
                </Td>
                <Td className="text-muted-foreground">
                  {entry.actorId ?? 'system'}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}

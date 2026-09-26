/**
 * `/admin/clients` — agency clients and their portal access (Phase 8).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { listClients, recentClientActivity } from '@/lib/clients/queries';
import { formatAdDateTime } from '@/lib/format/date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Clients' };

export default async function AdminClientsPage() {
  const [clients, activity] = await Promise.all([
    listClients(),
    recentClientActivity(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[30px] leading-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agency clients and what they see at the client portal.
          </p>
        </div>
        <Link href="/admin/clients/new" className={buttonClasses('primary')}>
          New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add a client to give them a portal: their projects’ stages and dates, deliverables to approve, shared files, a message thread and their invoices."
          action={
            <Link
              href="/admin/clients/new"
              className={buttonClasses('primary')}
            >
              Add the first client
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <DataTable>
              <thead>
                <tr>
                  <Th className="pt-3">Client</Th>
                  <Th className="pt-3" numeric>
                    People
                  </Th>
                  <Th className="pt-3" numeric>
                    Live projects
                  </Th>
                  <Th className="pt-3">Last heard from</Th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.archivedAt ? (
                        <Badge tone="quiet" className="ml-2">
                          Archived
                        </Badge>
                      ) : null}
                    </Td>
                    <Td numeric>{c.people}</Td>
                    <Td numeric>
                      {c.activeProjects}
                      <span className="text-muted-foreground">
                        {' '}
                        / {c.totalProjects}
                      </span>
                    </Td>
                    <Td className="text-[13px] text-muted-foreground">
                      {c.lastClientMessageAt
                        ? formatAdDateTime(c.lastClientMessageAt)
                        : '—'}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest from clients</CardTitle>
            </CardHeader>
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No client messages yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a, i) => (
                    <li key={i}>
                      <Link
                        href={`/admin/projects/${a.projectId}#messages`}
                        className="block rounded-md hover:bg-muted/60"
                      >
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {a.clientName}
                          </span>{' '}
                          · {a.projectName}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm">{a.body}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatAdDateTime(a.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Audit log — `/admin/audit`.
 *
 * "On Vercel there is no SSH — the audit log is the debugger" (docs/RULES.md
 * §5). This is the screen that makes that true for a human rather than for a
 * psql session.
 *
 * The filter is a set of links rather than a form: an action is a filter worth
 * linking to, and a URL that carries the filter can be pasted into a message
 * to the other founder.
 */
import Link from 'next/link';

import { auditActions, listAuditEntries } from '@/lib/admin/audit-queries';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { BsDate } from '@/components/ui/bs-date';
import { AuditDetail } from '@/components/admin/audit-detail';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({
  searchParams,
}: PageProps<'/admin/audit'>) {
  const { action } = await searchParams;
  const selected = typeof action === 'string' ? action : undefined;

  const [entries, actions] = await Promise.all([
    listAuditEntries({ action: selected }),
    auditActions(),
  ]);

  return (
    <div>
      <h1 className="headline text-[30px] leading-tight">Audit log</h1>
      <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
        Every admin mutation, in the order it happened. Append-only — entries
        cannot be edited or removed, including by us.
      </p>

      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <FilterLink href="/admin/audit" active={!selected}>
            All
          </FilterLink>
          {actions.map((name) => (
            <FilterLink
              key={name}
              href={`/admin/audit?action=${encodeURIComponent(name)}`}
              active={selected === name}
            >
              {name}
            </FilterLink>
          ))}
        </div>
      ) : null}

      <Card className="mt-6">
        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={selected ? 'Nothing under this action' : 'Nothing recorded yet'}
              description={
                selected
                  ? 'No entry carries this action. It may have been filtered from a stale link.'
                  : 'Publishing a page, saving a setting or approving a payment is recorded here, with who did it and when.'
              }
            />
          </div>
        ) : (
          <DataTable dense>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Resource</Th>
                <Th>Actor</Th>
                <Th>IP</Th>
                <Th>Changed</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <Tr key={entry.id} className="align-top">
                  <Td className="py-2.5">
                    <BsDate date={entry.occurredAt} format="numeric" />
                  </Td>
                  <Td className="py-2.5 font-mono text-[13px]">{entry.action}</Td>
                  <Td className="py-2.5 text-muted-foreground">
                    {entry.resourceType}
                    {entry.resourceId ? (
                      <span className="numeric"> · {entry.resourceId}</span>
                    ) : null}
                  </Td>
                  <Td className="py-2.5 text-muted-foreground">
                    {entry.actorId ?? entry.actorType}
                  </Td>
                  <Td className="py-2.5 font-mono text-[12px] text-muted-foreground">
                    {entry.ipAddress ?? '—'}
                  </Td>
                  <Td className="py-2.5">
                    {entry.beforeState || entry.afterState ? (
                      <details>
                        <summary className="cursor-pointer text-[13px] text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                          What changed
                        </summary>
                        <div className="mt-2.5 max-w-[60ch]">
                          <AuditDetail
                            before={entry.beforeState}
                            after={entry.afterState}
                          />
                        </div>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-7 items-center rounded-md px-2.5 font-mono text-[12px]',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

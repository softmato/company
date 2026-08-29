/**
 * Admin dashboard.
 *
 * The top row answers "is anything wrong?" before it answers "how are we
 * doing?" (docs/UI_BRIEF.md §3.2). Today only one question has an answer:
 * whether the ledger balances. The money tiles arrive with the money.
 */
import Link from 'next/link';

import {
  recentActivity,
  unbalancedJournalCount,
} from '@/lib/admin/dashboard-queries';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatTile } from '@/components/ui/stat-tile';
import { BsDate } from '@/components/ui/bs-date';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [unbalanced, activity] = await Promise.all([
    unbalancedJournalCount(),
    recentActivity(),
  ]);

  const healthy = unbalanced === 0;

  return (
    <div>
      <h1 className="headline text-[30px] leading-tight">Dashboard</h1>

      {/*
        A known, unfixed fragility, parked here deliberately until the site has
        been fully reviewed. Plain text on purpose — it is a note to a person,
        not a feature, and it should cost nothing to keep or to delete.

        Do not remove it without fixing the underlying behaviour first; see
        docs/MEMORY.md, "The public site is one database away from a total
        404".
      */}
      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">
          Known issue — the public site depends entirely on this database.
        </p>
        <p className="mt-1.5">
          Every public page reads its content from here and calls{' '}
          <code className="font-mono text-xs">notFound()</code> when the row is
          missing or still a draft. So if this database is unreachable, or if a
          deployment is pointed at a different one, softmato.com does not
          degrade — <strong className="text-foreground">every page 404s</strong>
          , including the home page. This happened on 2026-08-29: production was
          pointed at a database in which all 22 content rows were still drafts,
          and the whole site returned 404 except{' '}
          <code className="font-mono text-xs">/blog</code>, which is the one
          page that needs no CMS row.
        </p>
        <p className="mt-1.5">
          Not fixed yet, and that is intentional — the fix (a cached fallback,
          or a build that fails loudly instead of shipping 404s) is worth doing
          once the site has been fully reviewed, not before. Until then: after
          any database or environment-variable change, load softmato.com and
          confirm the home page renders.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Unbalanced journals"
          value={unbalanced}
          alert={!healthy}
          note={
            healthy
              ? 'Every journal balances.'
              : 'The books are wrong. Investigate before posting anything further.'
          }
        />

        {/*
          Stated rather than shown as zero. A tile reading 0.00 because the
          feature is unbuilt tells a founder the company collected nothing.
        */}
        <StatTile
          label="Collected this month"
          value={<span className="text-muted-foreground">—</span>}
          note="Arrives with payments, in Phase 3."
        />

        <StatTile
          label="Awaiting approval"
          value={<span className="text-muted-foreground">—</span>}
          note="Arrives with the approvals queue, in Phase 3."
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <Link
            href="/admin/audit"
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Audit log
          </Link>
        </CardHeader>

        {activity.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Nothing has happened yet"
              description="Publishing a page, saving a setting or approving a payment is recorded here, with who did it and when."
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
              {activity.map((entry) => (
                <Tr key={entry.id}>
                  <Td>
                    <BsDate date={entry.occurredAt} format="numeric" />
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
    </div>
  );
}

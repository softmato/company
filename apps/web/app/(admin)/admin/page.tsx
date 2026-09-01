/**
 * Admin dashboard.
 *
 * The server owns the first read and the client tabs own only presentation
 * state. Refreshes use the same read model through the guarded internal API.
 */
import { dashboardSnapshot } from '@/lib/admin/dashboard-queries';
import { DashboardTabs } from '@/components/admin/dashboard-tabs';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const data = await dashboardSnapshot();

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

      <DashboardTabs initialData={data} />
    </div>
  );
}

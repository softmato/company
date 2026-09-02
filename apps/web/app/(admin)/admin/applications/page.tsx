/**
 * Every credential that may call `/api/v1`, and the state of each.
 *
 * This is the list; the acts are on the detail page. A screen that can revoke
 * from a row is a screen where revoking is one mis-click from a row above the
 * one you meant.
 */
import Link from 'next/link';

import { listApplications } from '@/lib/applications/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const applications = await listApplications();

  return (
    <div className="max-w-4xl">
      <Breadcrumbs trail={[]}>Applications</Breadcrumbs>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="headline text-2xl">Applications</h1>

        <Link
          href="/admin/applications/new"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Register an application
        </Link>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        One credential per product per environment. A credential alone is not
        enough to use the API: an application may only send customers to, and
        receive webhooks on, the domains registered against it.
      </p>

      {applications.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          No applications yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {applications.map((application) => (
            <li key={application.id}>
              <Link
                href={`/admin/applications/${application.id}`}
                className="block rounded-md border border-border p-4 transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-medium">
                    {application.name}{' '}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                        application.isLive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {application.isLive ? 'live' : 'sandbox'}
                    </span>
                    {application.revokedAt ? (
                      <span className="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                        revoked
                      </span>
                    ) : null}
                  </h2>

                  <code className="font-mono text-xs text-muted-foreground">
                    {application.clientId}
                  </code>
                </div>

                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="inline">Product </dt>
                    <dd className="inline">{application.productName}</dd>
                  </div>
                  <div>
                    <dt className="inline">Secret ends </dt>
                    <dd className="inline font-mono">
                      …{application.secretLast4}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Scopes </dt>
                    <dd className="inline">{application.scopes.length}</dd>
                  </div>
                  <div>
                    {/*
                     * Zero is called out rather than shown as a bare count: an
                     * application with no domains cannot be given a return URL
                     * or a webhook, so it is misconfigured, not merely empty.
                     */}
                    <dt className="inline">Domains </dt>
                    <dd
                      className={`inline ${
                        application.domainCount === 0 && !application.revokedAt
                          ? 'text-destructive'
                          : ''
                      }`}
                    >
                      {application.domainCount === 0
                        ? 'none registered'
                        : application.domainCount}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

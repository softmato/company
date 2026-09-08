/**
 * Every credential that may call `/api/v1`, and the state of each.
 *
 * This is the list; the acts are on the detail page. A screen that can revoke
 * from a row is a screen where revoking is one mis-click from a row above the
 * one you meant.
 */
import Link from 'next/link';

import { CREDENTIAL_MODE_LABEL } from '@softmato/db';

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
        One application per integration, holding up to two credential sets —
        Sandbox and Production. A credential alone is not enough to use the API:
        it may only send customers to, and receive webhooks on, the domains
        registered against that credential.
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
                  <h2 className="font-medium">{application.name}</h2>

                  <span className="text-xs text-muted-foreground">
                    {application.productName} · {application.scopes.length}{' '}
                    scopes
                  </span>
                </div>

                {/*
                 * Both modes are listed, including the one with no credential.
                 * "Production — not created" is the fact an admin most needs
                 * off this screen, and the old list could not express it: a
                 * missing Production credential was simply a row that was not
                 * there.
                 */}
                <ul className="mt-3 space-y-1.5">
                  {(['test', 'live'] as const).map((mode) => {
                    const credential = application.credentials.find(
                      (c) => c.mode === mode,
                    );
                    const label = CREDENTIAL_MODE_LABEL[mode];

                    return (
                      <li
                        key={mode}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            mode === 'live'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {label}
                        </span>

                        {credential ? (
                          <>
                            <code className="font-mono text-muted-foreground">
                              {credential.clientId}
                            </code>
                            <span className="text-muted-foreground">
                              secret ends …{credential.secretLast4}
                            </span>
                            {/*
                             * Zero is called out rather than shown as a bare
                             * count: a credential with no domains cannot be
                             * given a return URL or a webhook, so it is
                             * misconfigured, not merely empty.
                             */}
                            <span
                              className={
                                credential.domainCount === 0 &&
                                !credential.revokedAt
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              {credential.domainCount === 0
                                ? 'no domains registered'
                                : `${credential.domainCount} domains`}
                            </span>
                            {credential.revokedAt ? (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                                revoked
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            not created
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

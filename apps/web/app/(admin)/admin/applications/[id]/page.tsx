/**
 * One application: what the integration is, and its two credential sets.
 *
 * The shape is the schema's shape. Above: the name, the product, the scopes
 * and the active state — edited once, shared by both credentials. Below: a
 * Sandbox panel and a Production panel, each with its own client id, its own
 * secrets, its own webhook address and its own domain allowlist.
 *
 * **A mode with no credential still gets a panel**, carrying one button. That
 * is how the page says a second set is expected rather than missing, and it is
 * where the Production credential is minted from.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  APPLICATION_SCOPES,
  CREDENTIAL_MODE_LABEL,
  type CredentialMode,
} from '@softmato/db';

import { getApplicationDetail } from '@/lib/applications/queries';
import { ApplicationHeader } from '@/components/admin/application-header';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { CredentialPanel } from '@/components/admin/credential-panel';

export const dynamic = 'force-dynamic';

/** Sandbox first. It is the one that exists at registration. */
const MODES: CredentialMode[] = ['test', 'live'];

export default async function ApplicationDetailPage({
  params,
}: PageProps<'/admin/applications/[id]'>) {
  const { id } = await params;
  const applicationId = Number(id);

  if (!Number.isInteger(applicationId) || applicationId <= 0) notFound();

  const application = await getApplicationDetail(applicationId);

  if (!application) notFound();

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        trail={[{ label: 'Applications', href: '/admin/applications' }]}
      >
        {application.name}
      </Breadcrumbs>

      <h1 className="headline mt-2 text-2xl">{application.name}</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        {application.productName}
      </p>

      <section className="mt-8">
        <ApplicationHeader
          application={application}
          scopes={APPLICATION_SCOPES}
        />
      </section>

      <div className="mt-10 space-y-8">
        {MODES.map((mode) => {
          const credential = application.credentials.find(
            (c) => c.mode === mode,
          );

          return (
            <CredentialPanel
              key={mode}
              applicationId={application.id}
              applicationName={application.name}
              mode={mode}
              label={CREDENTIAL_MODE_LABEL[mode]}
              signingSecret={
                mode === 'test' ? application.sandboxSigningSecret : null
              }
              credential={credential}
              domains={(credential
                ? (application.domainsByCredential[credential.id] ?? [])
                : []
              ).map((domain) => ({
                id: domain.id,
                hostname: domain.hostname,
                note: domain.note,
                createdBy: domain.createdBy,
                createdAt: domain.createdAt.toISOString(),
              }))}
            />
          );
        })}
      </div>

      <p className="mt-10 text-sm">
        <Link
          href="/admin/applications"
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to applications
        </Link>
      </p>
    </div>
  );
}

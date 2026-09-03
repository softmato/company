/**
 * One application: what it is, where it may send people, and the acts that
 * change it.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { APPLICATION_SCOPES } from '@softmato/db';

import { getApplicationDetail } from '@/lib/applications/queries';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ApplicationPanel } from '@/components/admin/application-panel';
import { DomainList } from '@/components/admin/domain-list';
import { WebhookSecretPanel } from '@/components/admin/webhook-secret-panel';

export const dynamic = 'force-dynamic';

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
        {application.productName} ·{' '}
        {application.isLive ? 'live credential' : 'sandbox credential'}
      </p>

      {application.domains.length === 0 && !application.revokedAt ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          This application has no registered domains. Until one is added it can
          be given neither a return URL nor a webhook address, so{' '}
          <code className="font-mono">POST /v1/checkout</code> will refuse every{' '}
          <code className="font-mono">return_url</code> it sends.
        </p>
      ) : null}

      <section className="mt-8">
        <ApplicationPanel
          application={application}
          scopes={APPLICATION_SCOPES}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Registered domains</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exact hostnames, no wildcards. A subdomain is a different host and
          needs its own entry — listing{' '}
          <code className="font-mono">questioncall.com</code> does not allow{' '}
          <code className="font-mono">app.questioncall.com</code>.
        </p>

        <DomainList
          applicationId={application.id}
          domains={application.domains.map((domain) => ({
            id: domain.id,
            hostname: domain.hostname,
            note: domain.note,
            createdBy: domain.createdBy,
            createdAt: domain.createdAt.toISOString(),
          }))}
          readOnly={application.revokedAt !== null}
        />
      </section>

      {application.revokedAt ? null : (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Webhook signing secret</h2>
          <WebhookSecretPanel
            applicationId={application.id}
            hasWebhookSecret={application.hasWebhookSecret}
            isLive={application.isLive}
          />
        </section>
      )}

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

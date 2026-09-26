/**
 * `/admin/clients/12` — one client: who can sign in, their projects, and a
 * way to start the next one.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { setClientArchivedAction } from '@/app/(admin)/admin/clients/actions/set-client-archived';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ActionForm } from '@/components/admin/clients/action-form';
import { AddPersonForm } from '@/components/admin/clients/add-person-form';
import { NewProjectForm } from '@/components/admin/clients/new-project-form';
import { PeopleList } from '@/components/admin/clients/people-list';
import { SubmitButton } from '@/components/admin/submit-button';
import { ProjectCard } from '@/components/portal/project-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { clientDetail } from '@/lib/clients/queries';
import { formatAd } from '@/lib/format/date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Client' };

export default async function AdminClientPage({
  params,
}: PageProps<'/admin/clients/[clientId]'>) {
  const clientId = Number((await params).clientId);
  const detail =
    Number.isInteger(clientId) && clientId > 0
      ? await clientDetail(clientId)
      : null;
  if (!detail) notFound();

  const { client, people, projects, invoiceCount } = detail;
  const archived = client.archivedAt !== null;

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: 'Clients', href: '/admin/clients' }]}>
        {client.name}
      </Breadcrumbs>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline flex flex-wrap items-center gap-3 text-[30px] leading-tight">
            {client.name}
            {archived ? <Badge tone="quiet">Archived</Badge> : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client since {formatAd(client.createdAt)} · customer{' '}
            <span className="numeric">#{client.customerId}</span> ·{' '}
            {invoiceCount === 0
              ? 'no invoices yet'
              : `${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`}
          </p>
        </div>

        <ActionForm
          action={setClientArchivedAction}
          confirm={
            archived
              ? undefined
              : `Archive ${client.name}? Everyone at the client loses portal access at once. Nothing is deleted.`
          }
        >
          <input type="hidden" name="clientId" value={client.id} />
          <input type="hidden" name="archive" value={String(!archived)} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
            {archived ? 'Restore portal access' : 'Archive client'}
          </SubmitButton>
        </ActionForm>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="projects-heading" className="space-y-4">
          <h2 id="projects-heading" className="headline text-[19px]">
            Projects
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Start one below.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.map((s) => (
                <ProjectCard
                  key={s.project.id}
                  summary={s}
                  href={`/admin/projects/${s.project.id}`}
                />
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>New project</CardTitle>
            </CardHeader>
            <CardBody className="py-5">
              <NewProjectForm clientId={client.id} />
            </CardBody>
          </Card>
        </section>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>People with portal access</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <PeopleList people={people} />
            <div className="border-t border-border pt-4">
              <AddPersonForm clientId={client.id} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

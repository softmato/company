/**
 * `/admin/projects/7` — everything the client sees about a project, and the
 * controls that change it. Edits appear in the portal on the client's next
 * page load (Phase 8, acceptance 4).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { deleteDocumentAction } from '@/app/(admin)/admin/projects/actions/delete-document';
import { postAdminMessageAction } from '@/app/(admin)/admin/projects/actions/post-message';
import { uploadDocumentAction } from '@/app/(admin)/admin/projects/actions/upload-document';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ActionForm } from '@/components/admin/clients/action-form';
import { DeliverableEditor } from '@/components/admin/projects/deliverable-editor';
import { MilestoneEditor } from '@/components/admin/projects/milestone-editor';
import { ProjectDetailsForm } from '@/components/admin/projects/project-details-form';
import { StageEditor } from '@/components/admin/projects/stage-editor';
import { SubmitButton } from '@/components/admin/submit-button';
import { DocumentList } from '@/components/projects/document-list';
import { MessageComposer } from '@/components/projects/message-composer';
import { MessageThread } from '@/components/projects/message-thread';
import { StageTrack } from '@/components/projects/stage-track';
import { UploadForm } from '@/components/projects/upload-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { adminProject } from '@/lib/clients/queries';
import { documentStorageConfigured } from '@/lib/projects/document-storage';
import { PROJECT_LABEL, PROJECT_TONE } from '@/lib/projects/labels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Project' };

export default async function AdminProjectPage({
  params,
}: PageProps<'/admin/projects/[projectId]'>) {
  const projectId = Number((await params).projectId);
  const data =
    Number.isInteger(projectId) && projectId > 0
      ? await adminProject(projectId)
      : null;
  if (!data) notFound();

  const {
    project,
    stages,
    milestones,
    deliverables,
    documents,
    messages,
    clientName,
  } = data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        trail={[
          { label: 'Clients', href: '/admin/clients' },
          { label: clientName, href: `/admin/clients/${project.clientId}` },
        ]}
      >
        {project.name}
      </Breadcrumbs>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="headline text-[30px] leading-tight">{project.name}</h1>
        <Badge tone={PROJECT_TONE[project.status]}>
          {PROJECT_LABEL[project.status]}
        </Badge>
        {data.clientArchived ? (
          <Badge tone="quiet">Client archived — portal closed</Badge>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What the client sees</CardTitle>
        </CardHeader>
        <CardBody className="py-6">
          <StageTrack stages={stages} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stages</CardTitle>
            </CardHeader>
            <CardBody>
              <StageEditor projectId={project.id} stages={stages} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
            </CardHeader>
            <CardBody>
              <DeliverableEditor
                projectId={project.id}
                deliverables={deliverables}
              />
            </CardBody>
          </Card>

          <Card id="messages" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardBody className="space-y-6">
              <MessageThread messages={messages} side="admin" />
              <MessageComposer
                action={postAdminMessageAction}
                projectId={project.id}
                placeholder={`Write to ${clientName}…`}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <ProjectDetailsForm project={project} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key dates</CardTitle>
            </CardHeader>
            <CardBody>
              <MilestoneEditor projectId={project.id} milestones={milestones} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <DocumentList
                documents={documents}
                side="admin"
                hrefFor={(id) => `/api/admin/files/${id}`}
                action={(doc) => (
                  <ActionForm
                    action={deleteDocumentAction}
                    confirm={`Delete ${doc.fileName}? The client loses access to it too.`}
                  >
                    <input type="hidden" name="documentId" value={doc.id} />
                    <SubmitButton
                      variant="ghost"
                      size="sm"
                      pendingLabel="…"
                      aria-label={`Delete ${doc.fileName}`}
                    >
                      ✕
                    </SubmitButton>
                  </ActionForm>
                )}
              />
              {documentStorageConfigured ? (
                <div className="border-t border-border pt-4">
                  <UploadForm
                    action={uploadDocumentAction}
                    projectId={project.id}
                  />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  File sharing needs the private R2 bucket, which this
                  deployment does not have.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

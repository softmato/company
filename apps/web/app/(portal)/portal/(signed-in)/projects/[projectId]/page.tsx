/**
 * One project, for the client it belongs to.
 *
 * The id in the URL is looked up together with the viewer's client id, so a
 * changed number is a 404 — never another client's project (Phase 8,
 * acceptance 2).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CalendarDays,
  FolderOpen,
  Globe,
  MessagesSquare,
  PackageCheck,
  Route,
} from 'lucide-react';

import { uploadDocument } from '@/app/(portal)/portal/actions/upload-document';
import { postMessage } from '@/app/(portal)/portal/actions/post-message';
import { DeliverableCard } from '@/components/projects/deliverable-card';
import { DocumentList } from '@/components/projects/document-list';
import { MessageComposer } from '@/components/projects/message-composer';
import { MessageThread } from '@/components/projects/message-thread';
import { MilestoneList } from '@/components/projects/milestone-list';
import { StageTrack } from '@/components/projects/stage-track';
import { UploadForm } from '@/components/projects/upload-form';
import { BrowserFrame } from '@/components/portal/browser-frame';
import { DeliverableReview } from '@/components/portal/deliverable-review';
import { EmptyArt } from '@/components/portal/empty-art';
import { ProjectHero } from '@/components/portal/project-hero';
import { SectionCard } from '@/components/portal/section-card';
import { ART } from '@/lib/portal/art';
import { clientProject } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';
import { documentStorageConfigured } from '@/lib/projects/document-storage';
import { env } from '@/lib/env';
import { previewUrl } from '@/lib/projects/preview';

export const metadata: Metadata = { title: 'Project' };

export default async function PortalProjectPage({
  params,
}: PageProps<'/portal/projects/[projectId]'>) {
  const viewer = await requireViewer();
  const projectId = Number((await params).projectId);

  const bundle =
    Number.isInteger(projectId) && projectId > 0
      ? await clientProject(viewer.clientId, projectId)
      : null;

  if (!bundle) notFound();

  const { project, stages, milestones, deliverables, documents, messages } =
    bundle;
  const waiting = deliverables.filter((d) => d.status === 'in_review');
  const others = deliverables.filter((d) => d.status !== 'in_review');
  const stagesDone = stages.filter((s) => s.status === 'done').length;

  return (
    <div className="space-y-6">
      <ProjectHero
        project={project}
        stagesDone={stagesDone}
        stagesTotal={stages.length}
      />

      {project.previewSlug ? (
        <SectionCard
          icon={Globe}
          tone="emerald"
          title="Live preview"
          id="preview"
          meta="Updates as the team works"
          bodyClassName="px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <BrowserFrame
            url={previewUrl(project.previewSlug, env.NEXT_PUBLIC_APP_URL)}
            host={
              new URL(previewUrl(project.previewSlug, env.NEXT_PUBLIC_APP_URL))
                .host
            }
            title={`${project.name} — preview`}
          />
          <p className="mt-3 px-1 text-xs text-muted-foreground">
            Blank, or showing an error? The newest build may still be going up —
            use the open-in-new-tab button, or ask in the messages.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        icon={Route}
        tone="emerald"
        title="Where it stands"
        bodyClassName="px-5 pb-6 pt-4"
      >
        <StageTrack stages={stages} />
      </SectionCard>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <SectionCard
            icon={PackageCheck}
            tone="violet"
            title="Deliverables"
            id="deliverables"
            meta={
              waiting.length > 0
                ? `${waiting.length} waiting on you`
                : undefined
            }
          >
            {deliverables.length === 0 ? (
              <EmptyArt
                className="border-none bg-transparent py-4"
                art={ART.controls}
                title="Nothing to review yet"
                description="Work ready for you to see will appear here, with a link to open it and a button to approve it."
              />
            ) : (
              <div className="space-y-3">
                {waiting.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} side="client">
                    <DeliverableReview deliverableId={d.id} />
                  </DeliverableCard>
                ))}
                {others.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} side="client" />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={MessagesSquare}
            tone="sky"
            title="Messages"
            id="messages"
            bodyClassName="space-y-6 px-5 pb-5 pt-3"
          >
            <MessageThread messages={messages} side="client" />
            <MessageComposer
              action={postMessage}
              projectId={project.id}
              placeholder="Ask a question or leave feedback for the team…"
            />
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard icon={CalendarDays} tone="amber" title="Key dates">
            <MilestoneList milestones={milestones} />
          </SectionCard>

          <SectionCard
            icon={FolderOpen}
            tone="sky"
            title="Files"
            id="files"
            bodyClassName="space-y-4 px-3 pb-4 pt-2"
          >
            <DocumentList
              documents={documents}
              side="client"
              hrefFor={(id) => `/api/portal/files/${id}`}
            />
            {documentStorageConfigured ? (
              <div className="border-t border-border px-2 pt-4">
                <UploadForm action={uploadDocument} projectId={project.id} />
              </div>
            ) : null}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

/**
 * One project as the client sees it: hero, live preview with recent updates,
 * stages, deliverables, messages, key dates and files.
 *
 * Shared by the portal's project page and the public demo (`/client-portal`),
 * so the demo is the real screen, not a picture of it. `demo` drops every
 * control that writes — reviewing, messaging, uploading — and the file links.
 */
import {
  CalendarDays,
  FolderOpen,
  Globe,
  MessagesSquare,
  PackageCheck,
  Route,
} from 'lucide-react';

import { postMessage } from '@/app/(portal)/portal/actions/post-message';
import { uploadDocument } from '@/app/(portal)/portal/actions/upload-document';
import { DeliverableCard } from '@/components/projects/deliverable-card';
import { DeployList } from '@/components/projects/deploy-list';
import { DocumentList } from '@/components/projects/document-list';
import { MessageComposer } from '@/components/projects/message-composer';
import { MessageThread } from '@/components/projects/message-thread';
import { MilestoneList } from '@/components/projects/milestone-list';
import { StageTrack } from '@/components/projects/stage-track';
import { UploadForm } from '@/components/projects/upload-form';
import { formatAdDateTime } from '@/lib/format/date';
import { ART } from '@/lib/portal/art';
import type { ProjectBundle } from '@/lib/projects/bundle';
import { DEMO_BRIEF_HREF } from '@/lib/portal/demo';
import { documentStorageConfigured } from '@/lib/projects/document-storage';

import { BrowserFrame } from './browser-frame';
import { DeliverableReview } from './deliverable-review';
import { EmptyArt } from './empty-art';
import { ProjectHero } from './project-hero';
import { SectionCard } from './section-card';

export function ProjectView({
  bundle,
  previewSrc,
  demo = false,
}: {
  bundle: ProjectBundle;
  /** The preview's full address, or null when the project has none. */
  previewSrc: string | null;
  demo?: boolean;
}) {
  const {
    project,
    stages,
    milestones,
    deliverables,
    documents,
    messages,
    deploys,
  } = bundle;
  const latest = deploys[0];
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

      {previewSrc ? (
        <SectionCard
          icon={Globe}
          tone="emerald"
          title="Live preview"
          id="preview"
          meta={
            latest
              ? `Updated ${formatAdDateTime(latest.deployedAt)}`
              : 'Updates as the team works'
          }
          bodyClassName="px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <BrowserFrame
            url={previewSrc}
            host={new URL(previewSrc).host}
            title={`${project.name} — preview`}
            version={latest?.id}
          />
          <p className="mt-3 px-1 text-xs text-muted-foreground">
            Blank, or showing an error? The newest build may still be going up —
            use the open-in-new-tab button, or ask in the messages.
          </p>
          {project.vercelProjectId || demo ? (
            <div className="mt-4 border-t border-border px-1 pt-4">
              <h3 className="mb-3 text-sm font-semibold">Recent updates</h3>
              <DeployList deploys={deploys} />
            </div>
          ) : null}
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
                    {demo ? null : <DeliverableReview deliverableId={d.id} />}
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
            {demo ? null : (
              <MessageComposer
                action={postMessage}
                projectId={project.id}
                placeholder="Ask a question or leave feedback for the team…"
              />
            )}
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
              hrefFor={(id) =>
                demo ? DEMO_BRIEF_HREF : `/api/portal/files/${id}`
              }
            />
            {documentStorageConfigured && !demo ? (
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

import type { Metadata } from 'next';
import { FolderOpen } from 'lucide-react';

import { DocumentList } from '@/components/projects/document-list';
import { EmptyArt } from '@/components/portal/empty-art';
import { PageBanner } from '@/components/portal/page-banner';
import { ART } from '@/lib/portal/art';
import { clientDocuments } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';

export const metadata: Metadata = { title: 'Files' };

/** Every file across every project — the place to find "that PDF from March". */
export default async function PortalDocumentsPage() {
  const viewer = await requireViewer();
  const documents = await clientDocuments(viewer.clientId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBanner
        icon={FolderOpen}
        tone="sky"
        eyebrow={viewer.clientName}
        title="Files"
        description="Everything shared on your projects, newest first. Download links are private to your account."
        art={ART.database}
      />

      {documents.length === 0 ? (
        <EmptyArt
          art={ART.server}
          title="No files yet"
          description="Designs, contracts and handover documents shared on any of your projects will be collected here. You can add files from a project’s page."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-4">
          <DocumentList
            documents={documents}
            side="client"
            hrefFor={(id) => `/api/portal/files/${id}`}
          />
        </div>
      )}
    </div>
  );
}

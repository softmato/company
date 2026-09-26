import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from 'lucide-react';

import { BsDate } from '@/components/ui/bs-date';
import { cn } from '@/lib/cn';

export interface ListedDocument {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  createdAt: Date;
  projectName?: string;
}

/** `1.2 MB`, `340 KB`. */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A colour per kind of file, so a PDF and a spreadsheet differ at a glance. */
function fileLook(contentType: string): {
  icon: LucideIcon;
  tile: string;
  label: string;
} {
  if (contentType === 'application/pdf')
    return {
      icon: FileText,
      tile: 'bg-rose-500/12 text-rose-600',
      label: 'PDF',
    };
  if (contentType.startsWith('image/'))
    return {
      icon: FileImage,
      tile: 'bg-sky-500/12 text-sky-600',
      label: 'Image',
    };
  if (contentType.includes('spreadsheet'))
    return {
      icon: FileSpreadsheet,
      tile: 'bg-emerald-500/12 text-emerald-600',
      label: 'Excel',
    };
  if (contentType.includes('presentation'))
    return {
      icon: FileText,
      tile: 'bg-orange-500/12 text-orange-600',
      label: 'Slides',
    };
  if (contentType.includes('word'))
    return {
      icon: FileText,
      tile: 'bg-blue-500/12 text-blue-600',
      label: 'Word',
    };
  if (contentType === 'application/zip')
    return {
      icon: FileArchive,
      tile: 'bg-amber-500/14 text-amber-600',
      label: 'ZIP',
    };
  return { icon: File, tile: 'bg-muted text-muted-foreground', label: 'File' };
}

/**
 * Files on a project. Each link goes to a route that checks the viewer and
 * then redirects to a five-minute signed URL — `hrefFor` names that route,
 * which differs between the portal and the admin.
 */
export function DocumentList({
  documents,
  hrefFor,
  side,
  action,
  empty = 'No files yet.',
}: {
  documents: ListedDocument[];
  hrefFor: (id: number) => string;
  side: 'client' | 'admin';
  action?: (document: ListedDocument) => React.ReactNode;
  empty?: string;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => {
        const fromUs = doc.uploadedBy === 'admin';
        const look = fileLook(doc.contentType);
        const Icon = look.icon;
        const who =
          side === 'client'
            ? fromUs
              ? `From ${doc.uploaderName} at Softmato`
              : `Shared by ${doc.uploaderName}`
            : fromUs
              ? `Uploaded by ${doc.uploaderName}`
              : `From the client (${doc.uploaderName})`;

        return (
          <li
            key={doc.id}
            className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl',
                look.tile,
              )}
            >
              <Icon className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <a
                href={hrefFor(doc.id)}
                className="block truncate text-sm font-medium hover:text-emerald-700 hover:underline"
              >
                {doc.fileName}
              </a>
              <p className="truncate text-xs text-muted-foreground">
                {doc.projectName ? `${doc.projectName} · ` : ''}
                {who} · <BsDate date={doc.createdAt} /> ·{' '}
                {fileSize(doc.sizeBytes)}
              </p>
            </div>

            <a
              href={hrefFor(doc.id)}
              aria-label={`Download ${doc.fileName}`}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Download className="size-4" aria-hidden="true" />
            </a>

            {action ? action(doc) : null}
          </li>
        );
      })}
    </ul>
  );
}

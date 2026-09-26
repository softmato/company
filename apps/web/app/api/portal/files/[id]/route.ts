/**
 * `/api/portal/files/12` — a project file, for the client it belongs to.
 *
 * Answers with a redirect to a five-minute signed URL, issued only after the
 * file has been matched to the signed-in client (docs/RULES.md §6). The link
 * on the page is therefore safe to share: it opens nothing for anyone else.
 */
import { NextResponse } from 'next/server';

import { recordAudit } from '@/lib/audit';
import { presignDocumentDownload } from '@/lib/projects/document-storage';
import { clientDocument } from '@/lib/portal/queries';
import { currentViewer } from '@/lib/portal/session';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/portal/files/[id]'>,
) {
  const viewer = await currentViewer();

  if (!viewer) {
    return NextResponse.json(
      { message: 'Sign in to the client portal.' },
      { status: 401 },
    );
  }

  const id = Number((await context.params).id);
  const document =
    Number.isInteger(id) && id > 0
      ? await clientDocument(viewer.clientId, id)
      : null;

  if (!document) {
    return NextResponse.json({ message: 'No such file.' }, { status: 404 });
  }

  await recordAudit({
    actorType: 'client',
    actorId: String(viewer.userId),
    action: 'portal.document_downloaded',
    resourceType: 'project_document',
    resourceId: String(document.id),
  });

  return NextResponse.redirect(await presignDocumentDownload(document), 302);
}

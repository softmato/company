/**
 * `/api/admin/files/12` — any project file, for an admin. Same shape as the
 * portal's route: authorise, then redirect to a five-minute signed URL.
 */
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, projectDocuments } from '@softmato/db';

import { requireAdminApi } from '@/lib/admin/api-guard';
import { presignDocumentDownload } from '@/lib/projects/document-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/admin/files/[id]'>,
) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const id = Number((await context.params).id);
  const [document] =
    Number.isInteger(id) && id > 0
      ? await db
          .select({
            objectKey: projectDocuments.objectKey,
            fileName: projectDocuments.fileName,
            contentType: projectDocuments.contentType,
          })
          .from(projectDocuments)
          .where(eq(projectDocuments.id, id))
          .limit(1)
      : [];

  if (!document) {
    return NextResponse.json({ message: 'No such file.' }, { status: 404 });
  }

  return NextResponse.redirect(await presignDocumentDownload(document), 302);
}

'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db, projectDocuments } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';
import { deleteDocumentObject } from '@/lib/projects/document-storage';

/**
 * Removes a file from the project and from the bucket. The row goes first:
 * if the bucket delete then fails, the object is orphaned but unreachable —
 * nothing links to it — which is the safe way round.
 */
export async function deleteDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const documentId = idField(formData, 'documentId');
  if (!documentId) return { error: 'That file could not be found.' };

  const [document] = await db
    .delete(projectDocuments)
    .where(eq(projectDocuments.id, documentId))
    .returning({
      projectId: projectDocuments.projectId,
      objectKey: projectDocuments.objectKey,
      fileName: projectDocuments.fileName,
    });
  if (!document) return { error: 'That file could not be found.' };

  try {
    await deleteDocumentObject(document.objectKey);
  } catch (error) {
    console.warn(`[admin] ${document.objectKey} left in the bucket —`, error);
  }

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.document_delete',
    resourceType: 'project_document',
    resourceId: String(documentId),
    beforeState: { fileName: document.fileName, objectKey: document.objectKey },
  });

  await touchProject(document.projectId);
  revalidatePath('/portal/documents');
  return done();
}

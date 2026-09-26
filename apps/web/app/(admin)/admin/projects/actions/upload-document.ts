'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db, projectDocuments, projects } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin/require-admin';
import {
  done,
  idField,
  touchProject,
  type FormState,
} from '@/lib/clients/action-kit';
import {
  documentStorageConfigured,
  prepareDocument,
  putDocument,
} from '@/lib/projects/document-storage';

export async function uploadDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const adminId = await requireAdmin();
  const projectId = idField(formData, 'projectId');
  const file = formData.get('file');

  if (!documentStorageConfigured)
    return {
      error: 'The private bucket is not configured on this deployment.',
    };
  if (!projectId) return { error: 'That project could not be found.' };
  if (!(file instanceof File) || file.size === 0)
    return { error: 'Choose a file to upload.' };

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return { error: 'That project could not be found.' };

  const prepared = await prepareDocument(projectId, file);
  if (!prepared.ok) return { error: prepared.message };

  try {
    await putDocument(prepared.document);
  } catch (error) {
    console.error('[admin] document upload failed', error);
    return { error: 'The file could not be stored. Try again in a minute.' };
  }

  const { document } = prepared;
  const [row] = await db
    .insert(projectDocuments)
    .values({
      projectId,
      objectKey: document.objectKey,
      fileName: document.fileName,
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
      uploadedBy: 'admin',
      adminUserId: Number(adminId),
    })
    .returning({ id: projectDocuments.id });

  await recordAudit({
    actorType: 'admin',
    actorId: adminId,
    action: 'project.document_upload',
    resourceType: 'project_document',
    resourceId: String(row?.id),
    afterState: {
      projectId,
      fileName: document.fileName,
      sizeBytes: document.sizeBytes,
    },
  });

  await touchProject(projectId);
  revalidatePath('/portal/documents');
  return done();
}

'use server';

import { revalidatePath } from 'next/cache';

import { db, projectDocuments } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import {
  documentStorageConfigured,
  prepareDocument,
  putDocument,
} from '@/lib/projects/document-storage';
import { clientOwnsProject } from '@/lib/portal/queries';
import { requireViewer } from '@/lib/portal/session';

export interface UploadState {
  error?: string;
  uploaded?: number;
}

export async function uploadDocument(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const viewer = await requireViewer();
  const projectId = Number(formData.get('projectId'));
  const file = formData.get('file');

  if (!documentStorageConfigured) {
    return {
      error:
        'File sharing is not switched on yet. Send it to your Softmato contact instead.',
    };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to upload.' };
  }
  if (
    !Number.isInteger(projectId) ||
    !(await clientOwnsProject(viewer.clientId, projectId))
  ) {
    return { error: 'That project could not be found.' };
  }

  const prepared = await prepareDocument(projectId, file);
  if (!prepared.ok) return { error: prepared.message };

  const { document } = prepared;

  try {
    await putDocument(document);
  } catch (error) {
    console.error('[portal] document upload failed', error);
    return { error: 'The file could not be stored. Try again in a minute.' };
  }

  const [row] = await db
    .insert(projectDocuments)
    .values({
      projectId,
      objectKey: document.objectKey,
      fileName: document.fileName,
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
      uploadedBy: 'client',
      clientUserId: viewer.userId,
    })
    .returning({ id: projectDocuments.id });

  await recordAudit({
    actorType: 'client',
    actorId: String(viewer.userId),
    action: 'portal.document_uploaded',
    resourceType: 'project_document',
    resourceId: String(row?.id),
    afterState: {
      projectId,
      fileName: document.fileName,
      sizeBytes: document.sizeBytes,
    },
  });

  revalidatePath(`/portal/projects/${projectId}`);
  revalidatePath('/portal/documents');
  return { uploaded: Date.now() };
}

/**
 * Project documents in the private bucket.
 *
 * Stored through the server (the bytes have to be checked and stripped before
 * they land), read back only through a presigned URL that lives five minutes
 * and is issued after the caller has been authorised (docs/RULES.md §6). The
 * bucket itself is never public, so a document without such a URL is
 * unreachable — Phase 8, acceptance 3.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  privateBucket,
  privateR2,
  privateStorageConfigured,
} from '@/lib/storage/private-client';

import {
  ACCEPTED_DESCRIPTION,
  MAX_DOCUMENT_BYTES,
  detectDocument,
  safeFileName,
  stripMetadata,
} from './document-file';

export { privateStorageConfigured as documentStorageConfigured };

/** docs/RULES.md §6: five minutes. */
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

export interface PreparedDocument {
  objectKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  body: Uint8Array;
}

export type PrepareResult =
  { ok: true; document: PreparedDocument } | { ok: false; message: string };

/** Validates and cleans an upload. Nothing is stored yet. */
export async function prepareDocument(
  projectId: number,
  file: File,
): Promise<PrepareResult> {
  if (file.size === 0) return { ok: false, message: 'That file is empty.' };
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      message: 'Files can be up to 4 MB. Zip or compress it and try again.',
    };
  }

  const raw = new Uint8Array(await file.arrayBuffer());
  const detected = detectDocument(raw, file.name);

  if (!detected) {
    return {
      ok: false,
      message: `That file type is not accepted. Upload a ${ACCEPTED_DESCRIPTION} file.`,
    };
  }

  const body = stripMetadata(raw, detected.contentType);

  return {
    ok: true,
    document: {
      objectKey: `projects/${projectId}/${randomUUID()}.${detected.extension}`,
      fileName: safeFileName(file.name, detected.extension),
      contentType: detected.contentType,
      sizeBytes: body.length,
      body,
    },
  };
}

export async function putDocument(document: PreparedDocument): Promise<void> {
  await privateR2().send(
    new PutObjectCommand({
      Bucket: privateBucket(),
      Key: document.objectKey,
      Body: document.body,
      ContentType: document.contentType,
      ContentDisposition: `attachment; filename="${document.fileName}"`,
    }),
  );
}

export async function deleteDocumentObject(objectKey: string): Promise<void> {
  await privateR2().send(
    new DeleteObjectCommand({ Bucket: privateBucket(), Key: objectKey }),
  );
}

/**
 * A short-lived download link. The response headers are pinned by the
 * signature, so the browser always saves the file rather than rendering it —
 * nothing uploaded is ever served back as a page.
 */
export async function presignDocumentDownload(document: {
  objectKey: string;
  fileName: string;
  contentType: string;
}): Promise<string> {
  return getSignedUrl(
    privateR2(),
    new GetObjectCommand({
      Bucket: privateBucket(),
      Key: document.objectKey,
      ResponseContentType: document.contentType,
      ResponseContentDisposition: `attachment; filename="${document.fileName}"`,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

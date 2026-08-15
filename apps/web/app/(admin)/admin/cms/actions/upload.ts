'use server';

import { randomUUID } from 'node:crypto';

import { recordAudit } from '@/lib/audit';
import {
  validateImage,
  validationMessage,
} from '@/lib/storage/image-validation';
import { cmsImageKey } from '@/lib/storage/object-key';
import { putCmsObject, r2Configured } from '@/lib/storage/r2';

import { requireAdmin } from './shared';

export interface UploadResult {
  ok: boolean;
  url?: string;
  message?: string;
}

/**
 * Uploads a CMS image and returns its public URL for the caller to store.
 *
 * The file is read into memory and validated by its bytes before anything is
 * sent to R2 — the declared content type and the filename are both attacker
 * controlled and neither is consulted (docs/ENVIRONMENT.md §3). The 5 MB cap
 * is checked after reading rather than trusting `File.size` for the same
 * reason.
 */
export async function uploadCmsImage(
  _previous: UploadResult | undefined,
  form: FormData,
): Promise<UploadResult> {
  const adminId = await requireAdmin();

  if (!r2Configured) {
    return {
      ok: false,
      message: 'Image storage is not configured. Paste a URL instead.',
    };
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return { ok: false, message: 'No file was received.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImage(bytes);

  if (!validation.ok) {
    return { ok: false, message: validationMessage(validation.reason) };
  }

  const key = cmsImageKey(
    String(form.get('slug') ?? file.name),
    validation.extension,
    randomUUID(),
  );

  try {
    const url = await putCmsObject({
      key,
      body: bytes,
      contentType: validation.mime,
    });

    await recordAudit({
      actorType: 'admin',
      actorId: adminId,
      action: 'cms.upload',
      resourceType: 'cms_image',
      resourceId: key,
      afterState: { key, mime: validation.mime, bytes: bytes.length },
    });

    return { ok: true, url, message: 'Uploaded.' };
  } catch (error) {
    console.error('cms image upload failed', { key, error });
    return { ok: false, message: 'The upload failed. Please try again.' };
  }
}

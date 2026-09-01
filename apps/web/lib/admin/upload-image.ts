import { MAX_UPLOAD_BYTES } from '@/lib/storage/image-validation';

/**
 * The browser half of an admin image upload.
 *
 * Three calls, because the file goes straight to R2 and never through our
 * server:
 *
 *   1. `POST /api/admin/upload` — asks for a presigned URL.
 *   2. `PUT` to that URL — the actual bytes, browser → R2.
 *   3. `POST /api/admin/upload/confirm` — the server checks what landed and
 *      returns the public URL, or throws the object away.
 *
 * Only after step three is the upload real, so nothing here reconstructs the
 * public URL from the key — a caller gets a URL because the server verified
 * the file, not because the PUT returned 200.
 *
 * No `server-only`: this is the one piece of the flow that runs in the client
 * bundle. It holds no credentials — the signature is the server's.
 */

export interface UploadResult {
  ok: boolean;
  url?: string;
  message?: string;
}

interface SignResponse extends UploadResult {
  key?: string;
  uploadUrl?: string;
  contentType?: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  /*
   * Checked here purely so an oversized file fails instantly instead of after
   * a round trip. The server checks it again, and then the bucket's copy is
   * measured a third time — this one is a courtesy, not a control.
   */
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'That file is larger than 5 MB.' };
  }

  /* ── 1. Ask for a URL ─────────────────────────────────────────────── */
  let signed: SignResponse;
  try {
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    signed = await response.json();
  } catch {
    return { ok: false, message: 'The upload could not be started.' };
  }

  if (!signed.ok || !signed.uploadUrl || !signed.key || !signed.contentType) {
    return {
      ok: false,
      message: signed.message ?? 'The upload could not be started.',
    };
  }

  /* ── 2. Send the bytes to R2 ──────────────────────────────────────── */
  let stored: Response;
  try {
    stored = await fetch(signed.uploadUrl, {
      method: 'PUT',
      /* Signed, so it must match exactly or R2 rejects the request. */
      headers: { 'content-type': signed.contentType },
      body: file,
    });
  } catch {
    /*
     * A PUT to another origin that never gets a response is almost always the
     * bucket's CORS rules rather than the file — worth saying, because the
     * fix is in Cloudflare and not in the admin's hands.
     */
    return {
      ok: false,
      message:
        'Could not reach image storage. The bucket may not allow uploads from this site.',
    };
  }

  if (!stored.ok) {
    return {
      ok: false,
      message:
        stored.status === 403
          ? 'The upload link expired. Please try again.'
          : 'The upload failed. Please try again.',
    };
  }

  /* ── 3. Have the server vouch for it ──────────────────────────────── */
  try {
    const response = await fetch('/api/admin/upload/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: signed.key }),
    });

    const result: UploadResult = await response.json();

    return {
      ok: result.ok,
      ...(result.url ? { url: result.url } : {}),
      message: result.message ?? (result.ok ? 'Uploaded.' : 'Upload failed.'),
    };
  } catch {
    return { ok: false, message: 'The upload could not be verified.' };
  }
}

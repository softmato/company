import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin/api-guard';
import {
  extensionForMime,
  isImageMime,
  MAX_UPLOAD_BYTES,
} from '@/lib/storage/image-validation';
import { cmsImageKey } from '@/lib/storage/object-key';
import { r2Configured } from '@/lib/storage/r2-client';
import {
  presignCmsUpload,
  UPLOAD_URL_TTL_SECONDS,
} from '@/lib/storage/r2-presign';

/**
 * Step one of an admin upload: hand back a URL the browser can PUT to.
 *
 * The file does not come here. This route decides *where* it may go and *what
 * it may be stored as*, signs exactly that, and returns. The bytes travel
 * browser → R2 directly, which is what lifts the 4.5 MB serverless body limit
 * off a 5 MB product rule (see `lib/storage/r2-presign.ts`).
 *
 * The declared size and type are the client's word for it and are treated as
 * such — the size is a courtesy check so an obviously oversized file is
 * refused before anyone waits on an upload, and the type only has to survive
 * a four-entry allowlist. Neither is trusted afterwards: `confirm` re-measures
 * the object and reads its real bytes before the URL reaches the CMS.
 */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  if (!r2Configured) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Image storage is not configured. Paste a URL instead.',
      },
      { status: 503 },
    );
  }

  /* ── Read the request ─────────────────────────────────────────────── */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Could not read the request.' },
      { status: 400 },
    );
  }

  const { filename, contentType, size } = (body ?? {}) as {
    filename?: unknown;
    contentType?: unknown;
    size?: unknown;
  };

  /* ── Type must be one we are willing to sign ──────────────────────── */
  if (!isImageMime(contentType)) {
    return NextResponse.json(
      { ok: false, message: 'That is not a JPEG, PNG, WebP or GIF image.' },
      { status: 422 },
    );
  }

  /* ── Declared size, checked so nobody waits to be told no ─────────── */
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json(
      { ok: false, message: 'That file is empty.' },
      { status: 422 },
    );
  }

  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, message: 'That file is larger than 5 MB.' },
      { status: 413 },
    );
  }

  /* ── Sign one key, for one type ───────────────────────────────────── */
  const key = cmsImageKey(
    typeof filename === 'string' && filename ? filename : 'image',
    extensionForMime(contentType),
    randomUUID(),
  );

  try {
    const uploadUrl = await presignCmsUpload({ key, contentType });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      contentType,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error('could not presign admin upload', { key, error });
    return NextResponse.json(
      { ok: false, message: 'The upload could not be started.' },
      { status: 500 },
    );
  }
}

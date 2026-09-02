import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin/api-guard';
import { recordAudit } from '@/lib/audit';
import { detectImage, MAX_UPLOAD_BYTES } from '@/lib/storage/image-validation';
import { parseCmsImageKey } from '@/lib/storage/object-key';
import { publicUrl, r2Configured } from '@/lib/storage/r2-client';
import {
  deleteCmsObject,
  headCmsObject,
  readCmsObjectPrefix,
} from '@/lib/storage/r2-object';

/**
 * Step two of an admin upload: verify what actually landed, then release it.
 *
 * docs/ENVIRONMENT.md §3 requires that an upload's type be decided by magic
 * bytes and its size capped at 5 MB. A presigned PUT means the server never
 * sees the bytes on their way past — so both rules move here, and are applied
 * to the object *in the bucket* rather than to a request body.
 *
 * Until this route returns a URL, the upload is nothing: the key is a uuid
 * nobody can guess and no row in the CMS points at it. An object that fails
 * either check is deleted and never named to the caller.
 *
 * Reading is ranged — the longest signature we match is twelve bytes, so
 * verification costs a few dozen bytes regardless of how big the file is.
 */

/** Comfortably past the twelve-byte WebP signature. */
const SIGNATURE_BYTES = 16;

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  if (!r2Configured) {
    return NextResponse.json(
      { ok: false, message: 'Image storage is not configured.' },
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

  const { key } = (body ?? {}) as { key?: unknown };

  /*
   * The key came from the browser and this route both reads and deletes what
   * it names, so it is only acted on if it has the exact shape the server
   * itself emits.
   */
  const parsed = typeof key === 'string' ? parseCmsImageKey(key) : null;
  if (!parsed) {
    return NextResponse.json(
      { ok: false, message: 'That upload could not be found.' },
      { status: 400 },
    );
  }

  const objectKey = key as string;

  /* ── Did it arrive? ───────────────────────────────────────────────── */
  const size = await headCmsObject(objectKey);
  if (size === null) {
    return NextResponse.json(
      { ok: false, message: 'That upload could not be found.' },
      { status: 404 },
    );
  }

  if (size === 0) {
    await deleteCmsObject(objectKey);
    return NextResponse.json(
      { ok: false, message: 'That file is empty.' },
      { status: 422 },
    );
  }

  /*
   * The real size, from the bucket. The sign step only ever saw a number the
   * client typed; this is the one that counts.
   */
  if (size > MAX_UPLOAD_BYTES) {
    await deleteCmsObject(objectKey);
    return NextResponse.json(
      { ok: false, message: 'That file is larger than 5 MB.' },
      { status: 413 },
    );
  }

  /* ── Is it actually an image? ─────────────────────────────────────── */
  const prefix = await readCmsObjectPrefix(objectKey, SIGNATURE_BYTES);
  if (!prefix) {
    return NextResponse.json(
      { ok: false, message: 'That upload could not be read.' },
      { status: 502 },
    );
  }

  const detected = detectImage(prefix);
  if (!detected) {
    await deleteCmsObject(objectKey);
    return NextResponse.json(
      { ok: false, message: 'That is not a JPEG, PNG, WebP or GIF image.' },
      { status: 422 },
    );
  }

  /*
   * The object is stored, and will be served, as the type signed at step one.
   * If the bytes turn out to be a different image than the one declared, the
   * stored `Content-Type` is a lie and the key's extension is wrong — so this
   * is rejected rather than quietly corrected. Re-signing under the detected
   * type would mean the client picks the type by lying about it, which is the
   * behaviour magic-byte validation exists to prevent.
   */
  if (detected.extension !== parsed.extension) {
    await deleteCmsObject(objectKey);
    return NextResponse.json(
      {
        ok: false,
        message: `That file is a ${detected.extension.toUpperCase()}, not a ${parsed.extension.toUpperCase()}. Re-save it and try again.`,
      },
      { status: 422 },
    );
  }

  /* ── Release it ───────────────────────────────────────────────────── */
  await recordAudit({
    actorType: 'admin',
    actorId: guard.adminId,
    action: 'cms.upload',
    resourceType: 'cms_image',
    resourceId: objectKey,
    afterState: { key: objectKey, mime: detected.mime, bytes: size },
  });

  return NextResponse.json({
    ok: true,
    url: publicUrl(objectKey),
    message: 'Uploaded.',
  });
}

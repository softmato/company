import 'server-only';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { ImageMime } from './image-validation';
import { publicBucket, r2 } from './r2-client';

/**
 * Presigned PUT URLs, so an upload goes browser → R2 and never through us.
 *
 * The file itself is the reason. A serverless function on Vercel rejects a
 * request body over 4.5 MB before our handler runs, which is *below* the 5 MB
 * the product allows — so routing bytes through the server made the last
 * 0.5 MB of the documented range impossible to upload. Signing a URL and
 * stepping out of the way removes the ceiling entirely, and stops paying to
 * move every megabyte twice.
 *
 * What the signature pins down:
 *
 * - **The key.** The caller never chooses where its file lands; the server
 *   built the key and signed exactly that one.
 * - **`Content-Type`.** R2 stores and later *serves* this value, so it is the
 *   one header that must not be left free. It is signed, which means R2 will
 *   reject a PUT that sends anything else, and it is chosen from a
 *   four-entry allowlist server-side. That is what keeps the public bucket
 *   from ever serving a caller-supplied `text/html`.
 * - **A short life.** Two minutes is enough to start an upload and useless to
 *   anyone who finds the URL later.
 *
 * What it deliberately does *not* pin down is the bytes. Nothing signed can
 * make a browser send an actual PNG, so the magic-byte rule that
 * docs/ENVIRONMENT.md §3 requires cannot live here — it moves to the confirm
 * step, which reads the first bytes back out of the bucket before the URL is
 * ever handed to the CMS. See `app/api/admin/upload/confirm/route.ts`.
 */

/** Long enough to begin a large upload, short enough to be worthless if leaked. */
export const UPLOAD_URL_TTL_SECONDS = 120;

export async function presignCmsUpload({
  key,
  contentType,
}: {
  key: string;
  contentType: ImageMime;
}): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: publicBucket(),
      Key: key,
      ContentType: contentType,
      /* Content-addressed by uuid, so it can never be stale. */
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      /*
       * Without this the presigner hoists `content-type` into the query string
       * as a hint the client is free to contradict. Naming it here puts it in
       * SignedHeaders, so R2 compares what was sent against what was signed
       * and 403s on a mismatch.
       */
      signableHeaders: new Set(['content-type']),
    },
  );
}

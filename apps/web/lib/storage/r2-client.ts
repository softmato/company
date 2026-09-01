import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

import { env, r2Configured } from '@/lib/env';

/**
 * The one S3 client pointed at Cloudflare R2 (docs/ENVIRONMENT.md §3).
 *
 * `region: 'auto'` and the account endpoint are what make an S3 client talk to
 * R2 — neither is optional.
 *
 * Everything in this folder reaches R2 through here so there is a single place
 * that knows the credentials, and a single place to audit. The module is
 * deliberately about the **public** bucket only: the private bucket holds
 * payment proofs and invoice PDFs, and when Phase 3 needs it, it gets its own
 * client module rather than a boolean parameter here. Mixing the two buckets
 * behind one accessor is how a payment proof ends up publicly readable.
 */

let client: S3Client | null = null;

export function r2(): S3Client {
  if (!r2Configured) {
    throw new Error('R2 is not configured');
  }

  client ??= new S3Client({
    region: 'auto',
    endpoint:
      env.R2_ENDPOINT ??
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    /*
     * Off, or every presigned PUT is born broken.
     *
     * The SDK defaults to `WHEN_SUPPORTED`, which computes a CRC32 of the
     * request body and pins it into the signature. At signing time there is no
     * body — the bytes are still on the browser — so what gets pinned is
     * `x-amz-checksum-crc32=AAAAAA==`, the checksum of nothing. R2 then
     * compares the real upload against it and answers 403, and because the
     * rejection carries no CORS headers the browser reports it as a CORS
     * failure, which sends you looking in entirely the wrong place.
     *
     * `WHEN_REQUIRED` keeps checksums for the operations that genuinely need
     * them and leaves the presigned URL clean. Integrity is still covered: TLS
     * on the wire, and the confirm step re-reads the stored object's size and
     * magic bytes before the URL is handed to the CMS.
     */
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return client;
}

/** The public bucket. There is no accessor for the private one on purpose. */
export function publicBucket(): string {
  return env.R2_PUBLIC_BUCKET!;
}

/** The URL a stored public object is served from. */
export function publicUrl(key: string): string {
  return `${env.R2_PUBLIC_BASE_URL!.replace(/\/$/, '')}/${key}`;
}

export { r2Configured };

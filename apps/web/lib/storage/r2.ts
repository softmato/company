import 'server-only';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env, r2Configured } from '@/lib/env';

/**
 * Cloudflare R2 through the S3 API (docs/ENVIRONMENT.md §3).
 *
 * `region: 'auto'` and the account endpoint are what make an S3 client talk to
 * R2 — neither is optional.
 *
 * This module only ever writes to the **public** bucket. The private bucket
 * holds payment proofs and invoice PDFs and is reached by presigned URL only;
 * when Phase 3 needs it, it gets its own module rather than a boolean
 * parameter here. Mixing the two buckets in one function is how a payment
 * proof ends up publicly readable.
 */

let client: S3Client | null = null;

function r2(): S3Client {
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
  });

  return client;
}

/**
 * Uploads to the public CMS bucket and returns the URL to store on the row.
 *
 * `contentType` comes from magic-byte detection, never from the client
 * (docs/ENVIRONMENT.md §3) — serving a caller-supplied content type from a
 * public bucket is how an "image" gets served as HTML.
 */
export async function putCmsObject({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<string> {
  await r2().send(
    new PutObjectCommand({
      Bucket: env.R2_PUBLIC_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
      /* Content-addressed by uuid, so it can never be stale. */
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${env.R2_PUBLIC_BASE_URL!.replace(/\/$/, '')}/${key}`;
}

export { r2Configured };

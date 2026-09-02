import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

import { env, privateStorageConfigured } from '@/lib/env';

/**
 * The private bucket, behind its own client.
 *
 * `r2-client.ts` says why this is a separate module rather than a bucket
 * argument: "Mixing the two buckets behind one accessor is how a payment proof
 * ends up publicly readable." The two modules share credentials and share
 * nothing else, and the difference that matters is visible in what each one
 * exports — the public module has `publicUrl()`, and **this one has no URL
 * function at all, deliberately**. There is no address a private object can be
 * handed out at. Reaching one always means going through a route that has
 * already decided the caller may see it.
 *
 * Configured independently too (`privateStorageConfigured`), because a
 * deployment can have the CMS bucket and not this one — the CMS shipped first.
 */

let client: S3Client | null = null;

export function privateR2(): S3Client {
  if (!privateStorageConfigured) {
    throw new Error('The private R2 bucket is not configured');
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
     * The same reasoning as the public client: the SDK's default checksum mode
     * pins a CRC32 into signatures that R2 then rejects. Nothing here is
     * presigned today, but the setting is a property of talking to R2 rather
     * than of any one operation, and the two clients disagreeing about it is a
     * difference nobody would go looking for.
     */
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return client;
}

/** The bucket holding payment proofs, invoice PDFs and client documents. */
export function privateBucket(): string {
  return env.R2_PRIVATE_BUCKET!;
}

export { privateStorageConfigured };

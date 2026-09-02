import 'server-only';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { privateBucket, privateR2 } from './private-client';

/**
 * Reading and writing one object in the private bucket.
 *
 * **Both functions answer `null` / `false` rather than throwing.** Every
 * caller so far is on a path where the object is a cache or an attachment, not
 * the thing being asked for: a document that cannot be fetched from R2 is
 * rendered instead, and a document that cannot be stored is simply rendered
 * again next time. Turning a bucket having a bad minute into a failed invoice
 * download would be trading a slow answer for no answer.
 *
 * That rule is *not* general. A future caller that fetches a payment proof —
 * where the object is the answer and a `null` would read as "no proof exists"
 * — needs its own function that distinguishes absence from failure, not a
 * boolean parameter added here.
 */

export async function readPrivateObject(key: string): Promise<Buffer | null> {
  try {
    const result = await privateR2().send(
      new GetObjectCommand({ Bucket: privateBucket(), Key: key }),
    );

    if (!result.Body) return null;

    return Buffer.from(await result.Body.transformToByteArray());
  } catch {
    // Includes `NoSuchKey`, which is the ordinary case on a first read.
    return null;
  }
}

export async function writePrivateObject({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<boolean> {
  try {
    await privateR2().send(
      new PutObjectCommand({
        Bucket: privateBucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        /*
         * Safe because the key carries a fingerprint of the bytes
         * (`lib/documents/object-key.ts`): a different document is a different
         * key, so a stored object is never the wrong answer to its own name.
         */
        CacheControl: 'private, max-age=31536000, immutable',
      }),
    );

    return true;
  } catch (error) {
    console.warn(`[storage] ${key} not stored —`, error);
    return false;
  }
}

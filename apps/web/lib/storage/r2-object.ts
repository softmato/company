import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { publicBucket, r2 } from './r2-client';

/**
 * The three public-bucket operations the confirm step needs.
 *
 * A presigned upload lands in the bucket before anything has looked at it, so
 * the server needs to be able to measure an object, peek at its first bytes,
 * and throw it away again. Those are small enough to belong together and
 * pointless anywhere else.
 */

/** Object size in bytes, or `null` when the key does not exist. */
export async function headCmsObject(key: string): Promise<number | null> {
  try {
    const result = await r2().send(
      new HeadObjectCommand({ Bucket: publicBucket(), Key: key }),
    );
    return result.ContentLength ?? null;
  } catch {
    return null;
  }
}

/**
 * The first `length` bytes of an object, fetched with a Range request.
 *
 * Ranged so that verifying a 5 MB upload costs a few dozen bytes of transfer
 * rather than pulling the whole file back — the longest signature we match is
 * twelve bytes.
 */
export async function readCmsObjectPrefix(
  key: string,
  length: number,
): Promise<Uint8Array | null> {
  try {
    const result = await r2().send(
      new GetObjectCommand({
        Bucket: publicBucket(),
        Key: key,
        Range: `bytes=0-${length - 1}`,
      }),
    );

    if (!result.Body) return null;
    return await result.Body.transformToByteArray();
  } catch {
    return null;
  }
}

/**
 * Removes an object.
 *
 * Used to take back an upload that failed verification. Failing to delete is
 * logged rather than thrown: the caller is already returning an error to the
 * admin, and the orphan is an unreferenced key under a uuid nobody can guess.
 */
export async function deleteCmsObject(key: string): Promise<void> {
  try {
    await r2().send(
      new DeleteObjectCommand({ Bucket: publicBucket(), Key: key }),
    );
  } catch (error) {
    console.error('failed to remove rejected upload', { key, error });
  }
}

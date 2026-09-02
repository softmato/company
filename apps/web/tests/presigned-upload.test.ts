/**
 * The pure parts of the presigned upload flow.
 *
 * A presigned PUT means the server never sees the bytes on their way to R2, so
 * two things have to hold up on their own:
 *
 *   - `isImageMime` decides what a signature is allowed to pin, because R2
 *     stores that value and later *serves* it.
 *   - `parseCmsImageKey` decides which objects the confirm route will read and
 *     delete, given a key that arrived from a browser.
 *
 * Both are the last line before something crosses a trust boundary, which is
 * why they are tested apart from the routes that call them.
 */
import { describe, expect, test } from 'vitest';

import {
  extensionForMime,
  isImageMime,
  MAX_UPLOAD_BYTES,
} from '@/lib/storage/image-validation';
import {
  CMS_IMAGE_PREFIX,
  cmsImageKey,
  parseCmsImageKey,
} from '@/lib/storage/object-key';
import { describeRejection, formatBytes } from '@/lib/uploads/describe';

const UUID = '0f9c2b1a-1111-2222-3333-444455556666';

/** `File` is available in the jsdom/undici globals vitest runs with. */
const file = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });

describe('isImageMime', () => {
  test('accepts the four types the product supports', () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(isImageMime(mime)).toBe(true);
    }
  });

  test('refuses anything that would be served as markup', () => {
    expect(isImageMime('text/html')).toBe(false);
    expect(isImageMime('image/svg+xml')).toBe(false);
    expect(isImageMime('application/octet-stream')).toBe(false);
  });

  test('refuses values that are not strings at all', () => {
    expect(isImageMime(undefined)).toBe(false);
    expect(isImageMime(null)).toBe(false);
    expect(isImageMime({ toString: () => 'image/png' })).toBe(false);
  });
});

describe('extensionForMime', () => {
  test('matches what cmsImageKey will put on the key', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('image/webp')).toBe('webp');
    expect(extensionForMime('image/gif')).toBe('gif');
  });
});

describe('parseCmsImageKey', () => {
  test('accepts a key cmsImageKey produced, and reports its extension', () => {
    const key = cmsImageKey('team photo', 'png', UUID);

    expect(parseCmsImageKey(key)).toEqual({ extension: 'png' });
  });

  test('round-trips every supported extension', () => {
    for (const extension of ['jpg', 'png', 'webp', 'gif']) {
      const key = cmsImageKey('cover', extension, UUID);
      expect(parseCmsImageKey(key)).toEqual({ extension });
    }
  });

  /*
   * The confirm route deletes what this returns a match for, so each of these
   * is an object it must refuse to touch.
   */
  test('refuses a key outside the CMS image prefix', () => {
    expect(parseCmsImageKey(`company/proofs/${UUID}-receipt.png`)).toBeNull();
    expect(parseCmsImageKey(`other/images/${UUID}-cover.png`)).toBeNull();
  });

  test('refuses a traversal', () => {
    expect(parseCmsImageKey(`${CMS_IMAGE_PREFIX}/../../etc/passwd`)).toBeNull();
    expect(
      parseCmsImageKey(`${CMS_IMAGE_PREFIX}/${UUID}-a/../../b.png`),
    ).toBeNull();
  });

  test('refuses a key with no uuid in front of it', () => {
    expect(parseCmsImageKey(`${CMS_IMAGE_PREFIX}/cover.png`)).toBeNull();
    expect(parseCmsImageKey(`${CMS_IMAGE_PREFIX}/not-a-uuid-cover.png`)).toBe(
      null,
    );
  });

  test('refuses an empty or non-key string', () => {
    expect(parseCmsImageKey('')).toBeNull();
    expect(parseCmsImageKey(CMS_IMAGE_PREFIX)).toBeNull();
    expect(parseCmsImageKey('https://example.com/evil.png')).toBeNull();
  });
});

describe('formatBytes', () => {
  test('reads the way a person would write it', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(MAX_UPLOAD_BYTES)).toBe('5 MB');
  });

  test('never shows a trailing .0', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
  });

  test('survives nonsense', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});

describe('describeRejection', () => {
  test('passes a plausible image', () => {
    expect(describeRejection(file('cover.png', 'image/png', 1024))).toBeNull();
  });

  test('names the size when a file is over the cap', () => {
    const message = describeRejection(
      file('huge.png', 'image/png', MAX_UPLOAD_BYTES + 1),
    );

    expect(message).toContain('5 MB');
  });

  test('refuses an empty file', () => {
    expect(describeRejection(file('empty.png', 'image/png', 0))).toBe(
      'That file is empty.',
    );
  });

  test('refuses a type the signature would never be allowed to pin', () => {
    expect(describeRejection(file('page.html', 'text/html', 10))).toContain(
      'not a JPEG',
    );
    expect(describeRejection(file('mystery', '', 10))).toContain('not a JPEG');
  });
});

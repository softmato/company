/**
 * Upload validation.
 *
 * The case that matters is the last one: a file whose extension and declared
 * content type say PNG but whose bytes say otherwise. That is the whole reason
 * docs/ENVIRONMENT.md §3 requires magic-byte detection, and it is the test
 * that would fail if someone "simplified" this to check the filename.
 */
import { describe, expect, test } from 'vitest';

import {
  detectImage,
  MAX_UPLOAD_BYTES,
  validateImage,
} from '@/lib/storage/image-validation';
import { CMS_IMAGE_PREFIX, cmsImageKey } from '@/lib/storage/object-key';

const bytes = (...values: number[]) => new Uint8Array(values);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const WEBP = bytes(
  0x52,
  0x49,
  0x46,
  0x46,
  0x24,
  0x08,
  0x00,
  0x00,
  0x57,
  0x45,
  0x42,
  0x50,
);

describe('magic byte detection', () => {
  test.each([
    ['JPEG', JPEG, 'image/jpeg', 'jpg'],
    ['PNG', PNG, 'image/png', 'png'],
    ['GIF', GIF, 'image/gif', 'gif'],
    ['WebP', WEBP, 'image/webp', 'webp'],
  ])('recognises %s', (_label, input, mime, extension) => {
    expect(detectImage(input)).toEqual({ mime, extension });
  });

  test('WebP is matched despite the varying size bytes', () => {
    const different = new Uint8Array(WEBP);
    different[4] = 0xff;
    different[5] = 0xee;

    expect(detectImage(different)?.mime).toBe('image/webp');
  });

  test('a truncated signature is not a match', () => {
    expect(detectImage(bytes(0x89, 0x50))).toBeNull();
  });
});

describe('validateImage', () => {
  test('accepts a real image', () => {
    expect(validateImage(PNG)).toEqual({
      ok: true,
      mime: 'image/png',
      extension: 'png',
    });
  });

  test('rejects an empty file', () => {
    const result = validateImage(new Uint8Array(0));
    expect(result).toEqual({ ok: false, reason: 'empty' });
  });

  test('rejects anything over 5 MB', () => {
    const large = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    large.set(PNG);

    expect(validateImage(large)).toEqual({ ok: false, reason: 'too-large' });
  });

  test('a PDF renamed to .png is rejected — extensions are not evidence', () => {
    // %PDF-
    const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31);

    expect(validateImage(pdf)).toEqual({
      ok: false,
      reason: 'unsupported-type',
    });
  });

  test('an HTML file claiming to be an image is rejected', () => {
    const html = new TextEncoder().encode('<html><script>alert(1)</script>');

    expect(validateImage(html)).toEqual({
      ok: false,
      reason: 'unsupported-type',
    });
  });
});

describe('cmsImageKey', () => {
  const uuid = '0f9c2b1a-1111-2222-3333-444455556666';

  test('follows the documented layout', () => {
    expect(cmsImageKey('team-photo', 'png', uuid)).toBe(
      `company/images/${uuid}-team-photo.png`,
    );
  });

  test('slugifies anything unusual in the name', () => {
    expect(cmsImageKey('Ram Bahadur (2026)!', 'jpg', uuid)).toBe(
      `${CMS_IMAGE_PREFIX}/${uuid}-ram-bahadur-2026.jpg`,
    );
  });

  test('a name that slugifies to nothing still produces a valid key', () => {
    expect(cmsImageKey('???', 'png', uuid)).toBe(
      `${CMS_IMAGE_PREFIX}/${uuid}-image.png`,
    );
  });

  test('a path traversal attempt cannot escape the image prefix', () => {
    const key = cmsImageKey('../../etc/passwd', 'png', uuid);

    expect(key.startsWith(`${CMS_IMAGE_PREFIX}/`)).toBe(true);
    expect(key).not.toContain('..');
    expect(key).not.toContain('/etc/');
  });

  test('a name cannot introduce a second path segment', () => {
    const key = cmsImageKey('logos/evil', 'png', uuid);

    expect(key.split('/')).toHaveLength(3);
  });
});

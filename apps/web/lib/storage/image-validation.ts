/**
 * Upload validation (docs/ENVIRONMENT.md §3).
 *
 * **MIME is decided by magic bytes, never by the extension or the
 * client-declared content type.** A browser will happily send
 * `Content-Type: image/png` for a file that is anything at all, and a `.png`
 * suffix costs an attacker one rename. The first few bytes are the only part
 * of an upload that is expensive to lie about.
 *
 * No `server-only` import here on purpose: this is pure and the tests exercise
 * it directly.
 */

/** 5 MB, per docs/ENVIRONMENT.md §3. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

interface Signature {
  mime: ImageMime;
  extension: string;
  /** Byte offset the pattern starts at. */
  offset: number;
  /** `null` matches any byte in that position. */
  bytes: (number | null)[];
}

const SIGNATURES: Signature[] = [
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    offset: 0,
    bytes: [0xff, 0xd8, 0xff],
  },
  {
    mime: 'image/png',
    extension: 'png',
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    mime: 'image/gif',
    extension: 'gif',
    offset: 0,
    bytes: [0x47, 0x49, 0x46, 0x38], // GIF8
  },
  /*
   * WebP is a RIFF container: 'RIFF' then a four-byte size that varies, then
   * 'WEBP'. The size bytes are why this needs wildcards rather than a plain
   * prefix compare.
   */
  {
    mime: 'image/webp',
    extension: 'webp',
    offset: 0,
    bytes: [
      0x52,
      0x49,
      0x46,
      0x46,
      null,
      null,
      null,
      null,
      0x57,
      0x45,
      0x42,
      0x50,
    ],
  },
];

export interface DetectedImage {
  mime: ImageMime;
  extension: string;
}

/**
 * Is this string one of the four types we accept?
 *
 * A presigned upload has to commit to a content type *before* any bytes
 * exist — R2 stores the value and later serves it, so it is signed into the
 * URL and cannot be a free-text field. This narrows a client-declared string
 * to the allowlist so the signature can only ever pin an image type.
 *
 * It says nothing about the file. `detectImage` still has the last word once
 * the bytes are readable; this only decides what we are willing to sign.
 */
export function isImageMime(value: unknown): value is ImageMime {
  return SIGNATURES.some((signature) => signature.mime === value);
}

/** The extension we store a given accepted type under. */
export function extensionForMime(mime: ImageMime): string {
  /* Every ImageMime comes from SIGNATURES, so this always finds one. */
  return SIGNATURES.find((signature) => signature.mime === mime)!.extension;
}

/** Returns null when the bytes are not a supported image. */
export function detectImage(bytes: Uint8Array): DetectedImage | null {
  for (const signature of SIGNATURES) {
    const end = signature.offset + signature.bytes.length;
    if (bytes.length < end) continue;

    const matches = signature.bytes.every((expected, index) => {
      if (expected === null) return true;
      return bytes[signature.offset + index] === expected;
    });

    if (matches) {
      return { mime: signature.mime, extension: signature.extension };
    }
  }

  return null;
}

export type ValidationFailure =
  | { ok: false; reason: 'too-large' }
  | { ok: false; reason: 'unsupported-type' }
  | { ok: false; reason: 'empty' };

export type ValidationResult =
  ({ ok: true } & DetectedImage) | ValidationFailure;

export function validateImage(bytes: Uint8Array): ValidationResult {
  if (bytes.length === 0) return { ok: false, reason: 'empty' };
  if (bytes.length > MAX_UPLOAD_BYTES)
    return { ok: false, reason: 'too-large' };

  const detected = detectImage(bytes);
  if (!detected) return { ok: false, reason: 'unsupported-type' };

  return { ok: true, ...detected };
}

export function validationMessage(reason: ValidationFailure['reason']): string {
  switch (reason) {
    case 'too-large':
      return 'That file is larger than 5 MB.';
    case 'unsupported-type':
      return 'That is not a JPEG, PNG, WebP or GIF image.';
    case 'empty':
      return 'That file is empty.';
  }
}

/**
 * What a project document may be, decided from its bytes (docs/RULES.md §6).
 *
 * The type comes from magic bytes, never the extension or the browser's
 * declared type. Images lose their metadata before they are stored — a phone
 * photo carries the GPS position it was taken at, and a client uploading a
 * screenshot has not agreed to share that.
 *
 * Pure, so the tests exercise it directly.
 */

/**
 * 4 MB, under the 5 MB the rules allow: an upload travels through a server
 * action, and Vercel refuses a request body over 4.5 MB before our code runs.
 */
// ponytail: server-action upload caps at ~4.5 MB; presigned PUT + confirm (as the CMS does) if clients need the full 5 MB
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

export interface DetectedFile {
  contentType: string;
  extension: string;
}

const OFFICE: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function startsWith(bytes: Uint8Array, pattern: number[]): boolean {
  return pattern.every((b, i) => bytes[i] === b);
}

export function detectDocument(
  bytes: Uint8Array,
  fileName: string,
): DetectedFile | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { contentType: 'application/pdf', extension: 'pdf' };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    /*
     * Word, Excel and PowerPoint files are zip archives. The bytes say "zip";
     * the extension only picks which zip, so a renamed archive still arrives
     * as a zip and is served as an attachment either way.
     */
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    const office = OFFICE[ext];
    return office
      ? { contentType: office, extension: ext }
      : { contentType: 'application/zip', extension: 'zip' };
  }
  return null;
}

export const ACCEPTED_DESCRIPTION =
  'PDF, PNG, JPEG, Word, Excel, PowerPoint or ZIP';

/** The `accept` attribute for the file input — a hint; the bytes decide. */
export const ACCEPT_ATTRIBUTE =
  '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx,.zip,application/pdf,image/png,image/jpeg,application/zip';

/**
 * JPEG: drop every APP1 (EXIF, XMP) and APP13 (IPTC) segment before the image
 * data. Everything from start-of-scan on is copied untouched.
 */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  let i = 2;

  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1]!;

    // Start of scan: the rest is image data.
    if (marker === 0xda) break;

    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) return bytes; // not a JPEG we understand

    if (marker !== 0xe1 && marker !== 0xed) {
      for (let j = i; j < end; j++) out.push(bytes[j]!);
    }
    i = end;
  }

  const result = new Uint8Array(out.length + (bytes.length - i));
  result.set(out, 0);
  result.set(bytes.subarray(i), out.length);
  return result;
}

const PNG_METADATA = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

/** PNG: drop metadata chunks. Chunk CRCs cover only their own chunk. */
function stripPng(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;

  while (i + 12 <= bytes.length) {
    const length =
      ((bytes[i]! << 24) |
        (bytes[i + 1]! << 16) |
        (bytes[i + 2]! << 8) |
        bytes[i + 3]!) >>>
      0;
    const end = i + 12 + length;
    if (end > bytes.length) return bytes;

    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    if (!PNG_METADATA.has(type)) parts.push(bytes.subarray(i, end));
    i = end;
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function stripMetadata(
  bytes: Uint8Array,
  contentType: string,
): Uint8Array {
  if (contentType === 'image/jpeg') return stripJpeg(bytes);
  if (contentType === 'image/png') return stripPng(bytes);
  return bytes;
}

/**
 * A display name safe to put in a `Content-Disposition` header. Keeps the
 * name readable; drops anything that could break out of the quoted string.
 */
export function safeFileName(name: string, extension: string): string {
  const base = name
    .replace(/\.[^.]*$/, '')
    .replace(/[^\w\s.()-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  return `${base || 'document'}.${extension}`;
}

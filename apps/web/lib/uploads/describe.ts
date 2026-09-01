import {
  MAX_UPLOAD_BYTES,
  type ImageMime,
} from '@/lib/storage/image-validation';

/**
 * Browser-side mirror of the upload rules, for copy and for the file picker.
 *
 * The server is always the authority — the sign route allowlists the type and
 * the confirm route reads the real bytes. This exists so the OS picker shows
 * the right files, the hint under a drop zone quotes the real limit, and an
 * obviously wrong file is refused before anyone spends bandwidth on it.
 *
 * A file that passes here can still be rejected server-side; that surfaces as
 * an ordinary upload error.
 */

const ACCEPTED: ImageMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const LABEL_BY_MIME: Record<ImageMime, string> = {
  'image/gif': 'GIF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

/** Value for `<input type="file" accept="…">`. */
export const ACCEPT_ATTRIBUTE = ACCEPTED.join(',');

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  /* One decimal for small values, but never a bare ".0" — "5 MB", not "5.0 MB". */
  const rounded =
    value >= 10 || exponent === 0 ? Math.round(value) : Number(value.toFixed(1));

  return `${rounded} ${units[exponent]}`;
}

/** "JPG, PNG, WebP or GIF up to 5 MB" — the line under a drop zone. */
export const UPLOAD_HINT = (() => {
  const labels = ACCEPTED.map((mime) => LABEL_BY_MIME[mime]);
  const last = labels[labels.length - 1];
  const listed = `${labels.slice(0, -1).join(', ')} or ${last}`;

  return `${listed} up to ${formatBytes(MAX_UPLOAD_BYTES)}`;
})();

/**
 * The largest file worth opening in the cropper.
 *
 * Deliberately well above the 5 MB upload cap: cropping and re-encoding a
 * 12 MP phone photo routinely lands it under the cap, so refusing on the
 * source size would turn a fixable file into a dead end. This ceiling only
 * exists so a 200 MB file cannot be handed to a canvas and take the tab down
 * with it.
 */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/** An error message when a picked file is too big to even open, else `null`. */
export function describeSourceRejection(file: File): string | null {
  if (file.size > MAX_SOURCE_BYTES) {
    return `That file is ${formatBytes(file.size)} — too large to open. Resize it first.`;
  }

  return null;
}

/** An error message when the file cannot be uploaded, `null` when it can. */
export function describeRejection(file: File): string | null {
  const mime = file.type.toLowerCase().trim();

  if (!mime || !ACCEPTED.includes(mime as ImageMime)) {
    return `That is not a JPEG, PNG, WebP or GIF image.`;
  }

  if (file.size <= 0) return 'That file is empty.';

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }

  return null;
}

import type { ImageMime } from '@/lib/storage/image-validation';

/**
 * What a cropped image comes back out as.
 *
 * Re-encoding is not free of consequence, so the type is chosen rather than
 * defaulted:
 *
 * - **PNG stays PNG.** A logo cropped to JPEG loses its transparency and gains
 *   a white box, which is exactly the asset most likely to be cropped.
 * - **WebP stays WebP**, when the browser can encode it. If it cannot,
 *   `toBlob` silently hands back a PNG, so the result is read back rather than
 *   assumed — a File whose declared type is a lie fails confirm.
 * - **JPEG stays JPEG** at 0.95, which is where the artefacts stop being
 *   visible at photographic sizes.
 * - **GIF is never cropped at all** — see `CROPPABLE`.
 */

/**
 * Types worth opening the cropper for.
 *
 * GIF is absent deliberately. A canvas keeps one frame, so cropping an
 * animation is a silent way to destroy it; an animated GIF uploads as it is.
 */
export const CROPPABLE: ImageMime[] = ['image/jpeg', 'image/png', 'image/webp'];

export function isCroppable(type: string): boolean {
  return CROPPABLE.includes(type as ImageMime);
}

/** Longest edge of the written file. Beyond this is bytes nobody displays. */
export const MAX_OUTPUT_EDGE = 3200;

const QUALITY = 0.95;

/**
 * Draws the framed region at output resolution and encodes it.
 *
 * Rejects rather than resolving to null: every failure here is something the
 * person needs told, and a null return gets forgotten at the call site.
 */
export async function encodeCrop({
  image,
  frame,
  offset,
  scale,
  type,
  name,
}: {
  frame: { height: number; width: number };
  image: HTMLImageElement;
  name: string;
  offset: { x: number; y: number };
  scale: number;
  type: string;
}): Promise<File> {
  /*
   * One factor scales the whole composition, so the output is the preview
   * enlarged — anything else and the result is not the framing that was
   * approved.
   *
   * `1 / scale` is the factor at which a frame pixel maps to a source pixel,
   * so the crop is written at exactly the resolution that actually exists
   * behind it: no invented detail when zoomed in, no thrown-away detail when
   * zoomed out. `MAX_OUTPUT_EDGE` then caps what a wide frame can ask for.
   */
  const outputFactor = Math.min(
    1 / scale,
    MAX_OUTPUT_EDGE / Math.max(frame.width, frame.height),
  );

  const width = Math.round(frame.width * outputFactor);
  const height = Math.round(frame.height * outputFactor);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This browser could not prepare the image.');
  }

  /*
   * JPEG has no alpha, so anything transparent would come out black without a
   * ground under it. PNG and WebP keep theirs.
   */
  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    offset.x * outputFactor,
    offset.y * outputFactor,
    image.naturalWidth * scale * outputFactor,
    image.naturalHeight * scale * outputFactor,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), type, QUALITY);
  });

  if (!blob) {
    throw new Error('Could not prepare the image. Please try another file.');
  }

  /*
   * `toBlob` falls back to PNG for a type the browser cannot encode, so the
   * blob's own type is the truth. Naming the file after it keeps the declared
   * type and the bytes in agreement, which is what the upload checks.
   */
  const actual = blob.type || 'image/png';
  const extension = actual.split('/')[1] ?? 'png';
  const stem = name.replace(/\.[^.]+$/, '') || 'image';

  return new File([blob], `${stem}.${extension}`, { type: actual });
}

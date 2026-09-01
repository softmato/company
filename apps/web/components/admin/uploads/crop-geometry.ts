/**
 * The arithmetic behind the crop window, kept out of the component.
 *
 * Panning and zooming an image inside a fixed frame is the kind of thing that
 * looks right until an off-by-one lets a transparent edge slide into view, so
 * it lives here where it can be reasoned about — and tested — without a canvas.
 */

export interface Offset {
  x: number;
  y: number;
}

export interface Frame {
  height: number;
  width: number;
}

/** How far a crop may be zoomed past the point where it just covers the frame. */
export const MAX_ZOOM = 4;

/** The aspect ratios offered, `null` meaning "however the file came". */
export type CropAspect = number | null;

export const ASPECT_CHOICES: { label: string; value: CropAspect }[] = [
  { label: 'Original', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
];

/**
 * The crop window, sized to an aspect ratio and made to fit `bounds`.
 *
 * The window is what the person frames against, so it is as large as the
 * dialog allows rather than a fixed square — a 16:9 hero cropped inside a
 * 320px box is mostly guesswork.
 */
export function frameFor(aspect: number, bounds: Frame): Frame {
  const width = Math.min(bounds.width, bounds.height * aspect);

  return { height: width / aspect, width };
}

/**
 * The smallest scale at which the image still covers the whole frame.
 *
 * Every other scale is clamped against this, which is what makes an empty
 * corner impossible rather than merely unlikely.
 */
export function coverScale(image: Frame, frame: Frame): number {
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** Holds the image over the frame, so panning cannot expose an edge. */
export function clampOffset(
  offset: Offset,
  image: Frame,
  frame: Frame,
  scale: number,
): Offset {
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: Math.min(0, Math.max(frame.width - width, offset.x)),
    y: Math.min(0, Math.max(frame.height - height, offset.y)),
  };
}

/** Centres the image in the frame at a given scale. */
export function centreOffset(
  image: Frame,
  frame: Frame,
  scale: number,
): Offset {
  return {
    x: (frame.width - image.width * scale) / 2,
    y: (frame.height - image.height * scale) / 2,
  };
}

/**
 * A zoom step, taken about the centre of the frame.
 *
 * Zooming about the image origin instead would drift whatever the person had
 * centred off toward a corner, which feels like the control is fighting them.
 */
export function zoomAboutCentre(
  offset: Offset,
  frame: Frame,
  from: number,
  to: number,
): Offset {
  const ratio = to / from;

  return {
    x: frame.width / 2 - (frame.width / 2 - offset.x) * ratio,
    y: frame.height / 2 - (frame.height / 2 - offset.y) * ratio,
  };
}

/**
 * Crop framing.
 *
 * The case that matters is the last group: no combination of ratio, zoom and
 * pan may leave a gap between the image and the edge of the frame. A crop that
 * exposes a corner writes a transparent — or on JPEG, black — band into a file
 * that then goes on the public site, and it is exactly the bug that survives
 * review because it only shows at the extremes.
 */
import { describe, expect, test } from 'vitest';

import {
  centreOffset,
  clampOffset,
  coverScale,
  frameFor,
  MAX_ZOOM,
  zoomAboutCentre,
  type Frame,
} from '@/components/admin/uploads/crop-geometry';
import { isCroppable } from '@/components/admin/uploads/crop-encode';

const BOUNDS: Frame = { height: 360, width: 520 };

describe('frameFor', () => {
  test('fills the width when the ratio is wider than the bounds', () => {
    const frame = frameFor(16 / 9, BOUNDS);

    expect(frame.width).toBe(520);
    expect(frame.height).toBeCloseTo(292.5);
  });

  test('fills the height when the ratio is taller than the bounds', () => {
    const frame = frameFor(1, BOUNDS);

    expect(frame.height).toBe(360);
    expect(frame.width).toBe(360);
  });

  test('never exceeds the bounds it was given', () => {
    for (const aspect of [0.2, 0.5, 1, 4 / 3, 16 / 9, 5]) {
      const frame = frameFor(aspect, BOUNDS);

      expect(frame.width).toBeLessThanOrEqual(BOUNDS.width + 0.001);
      expect(frame.height).toBeLessThanOrEqual(BOUNDS.height + 0.001);
      expect(frame.width / frame.height).toBeCloseTo(aspect);
    }
  });
});

describe('coverScale', () => {
  test('is the scale at which the image exactly covers the frame', () => {
    const image: Frame = { height: 500, width: 1000 };
    const frame: Frame = { height: 360, width: 360 };
    const scale = coverScale(image, frame);

    expect(image.height * scale).toBeCloseTo(360);
    expect(image.width * scale).toBeGreaterThanOrEqual(360);
  });

  test('scales a small image up rather than leaving a gap', () => {
    expect(
      coverScale({ height: 100, width: 100 }, { height: 360, width: 360 }),
    ).toBeCloseTo(3.6);
  });
});

describe('centreOffset', () => {
  test('leaves equal overflow on both axes', () => {
    const image: Frame = { height: 500, width: 1000 };
    const frame: Frame = { height: 300, width: 300 };
    const scale = coverScale(image, frame);
    const offset = centreOffset(image, frame, scale);

    /* Right edge overflows by as much as the left does. */
    expect(offset.x).toBeCloseTo(frame.width - image.width * scale - offset.x);
  });
});

describe('zoomAboutCentre', () => {
  test('holds the centre of the frame still', () => {
    const frame: Frame = { height: 300, width: 300 };
    const offset = { x: -50, y: -50 };

    const zoomed = zoomAboutCentre(offset, frame, 1, 2);

    /* What sat under the centre before still sits under it after. */
    const before = (frame.width / 2 - offset.x) / 1;
    const after = (frame.width / 2 - zoomed.x) / 2;

    expect(after).toBeCloseTo(before);
  });

  test('is a no-op when the scale does not change', () => {
    const frame: Frame = { height: 300, width: 300 };

    expect(zoomAboutCentre({ x: -20, y: -30 }, frame, 1.5, 1.5)).toEqual({
      x: -20,
      y: -30,
    });
  });
});

describe('clampOffset', () => {
  const image: Frame = { height: 800, width: 1200 };

  test('refuses to pan past the left or top edge', () => {
    const frame: Frame = { height: 300, width: 300 };
    const scale = coverScale(image, frame);

    expect(clampOffset({ x: 500, y: 500 }, image, frame, scale)).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('refuses to pan past the right or bottom edge', () => {
    const frame: Frame = { height: 300, width: 300 };
    const scale = coverScale(image, frame);
    const clamped = clampOffset({ x: -9999, y: -9999 }, image, frame, scale);

    expect(clamped.x).toBeCloseTo(frame.width - image.width * scale);
    expect(clamped.y).toBeCloseTo(frame.height - image.height * scale);
  });

  /*
   * The real guarantee, stated as one property over the whole space the UI can
   * reach: every ratio, every zoom from "just covers" to the maximum, and pans
   * far past both edges.
   */
  test('no ratio, zoom or pan can expose an edge', () => {
    const images: Frame[] = [
      { height: 800, width: 1200 },
      { height: 1200, width: 800 },
      { height: 600, width: 600 },
      { height: 90, width: 4000 },
    ];

    for (const source of images) {
      for (const aspect of [
        source.width / source.height,
        16 / 9,
        4 / 3,
        1,
      ]) {
        const frame = frameFor(aspect, BOUNDS);
        const min = coverScale(source, frame);

        for (const step of [0, 0.25, 0.5, 1]) {
          const scale = min + (min * MAX_ZOOM - min) * step;

          for (const pan of [
            { x: 5000, y: 5000 },
            { x: -5000, y: -5000 },
            { x: 5000, y: -5000 },
            { x: 0, y: 0 },
          ]) {
            const { x, y } = clampOffset(pan, source, frame, scale);

            /* Top-left never drifts inward, leaving a gap behind it. */
            expect(x).toBeLessThanOrEqual(0.001);
            expect(y).toBeLessThanOrEqual(0.001);

            /* Bottom-right always reaches at least the far edge. */
            expect(x + source.width * scale).toBeGreaterThanOrEqual(
              frame.width - 0.001,
            );
            expect(y + source.height * scale).toBeGreaterThanOrEqual(
              frame.height - 0.001,
            );
          }
        }
      }
    }
  });
});

describe('isCroppable', () => {
  test('opens the cropper for the still formats', () => {
    expect(isCroppable('image/jpeg')).toBe(true);
    expect(isCroppable('image/png')).toBe(true);
    expect(isCroppable('image/webp')).toBe(true);
  });

  /* A canvas keeps one frame, so cropping a GIF would silently kill it. */
  test('leaves an animated GIF alone', () => {
    expect(isCroppable('image/gif')).toBe(false);
  });

  test('does not claim files it has no business opening', () => {
    expect(isCroppable('application/pdf')).toBe(false);
    expect(isCroppable('')).toBe(false);
  });
});

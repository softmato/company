'use client';

/**
 * Whether this browser should be given a WebGL light-form at all.
 *
 * Memoised because `useSyncExternalStore` calls `getSnapshot` on every render
 * and compares the result with `Object.is`. Creating a canvas and asking it for
 * a context on each of those calls would be wasteful, and the answer cannot
 * change during a session.
 *
 * Two reasons to skip WebGL, both knowable only on the client:
 *
 *   1. No WebGL context — old browsers, hardware acceleration disabled, or a
 *      driver blocklist. R3F throws rather than degrading.
 *   2. `deviceMemory` under 4 GB. These scenes are cheap, but a low-end phone
 *      is already spending its budget on the page, and every section that
 *      holds a form is styled to read as finished without it.
 *
 * Reduced motion is deliberately NOT one of them. The forms are the page's
 * imagery; they stop moving under reduced motion, they do not disappear.
 */
let supported: boolean | undefined;

export function webglSupported(): boolean {
  if (supported !== undefined) return supported;

  const canvas = document.createElement('canvas');
  const hasWebgl = Boolean(
    canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
  );

  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const lowEnd = typeof memory === 'number' && memory < 4;

  supported = hasWebgl && !lowEnd;

  return supported;
}

/** Nothing to subscribe to — the answer is fixed for the life of the page. */
export const noopSubscribe = () => () => {};

/** The server never renders a canvas it could not have produced. */
export const serverSnapshot = () => false;

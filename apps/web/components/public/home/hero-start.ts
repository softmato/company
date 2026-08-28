'use client';

/**
 * When the hero is allowed to begin.
 *
 * **The entrance used to start on mount, and that is why it stuttered.** Mount
 * is the single busiest moment in the page's life: React is hydrating, the
 * route's chunks are still being evaluated, and three WebGL scenes further
 * down are compiling shaders. Profiling a refresh puts 200–330ms main-thread
 * tasks at 0.1s, 0.4s, 0.9s and 1.4s — all four inside the entrance. The
 * animation was not too expensive; it was running at the wrong time. That also
 * explains why roughly one refresh in ten looked right: whether those tasks
 * land on the animation is a race, and occasionally it wins.
 *
 * There is a second, sharper reason. The wordmark is set in a `next/font`
 * face, which ships `font-display: swap` — so the real font arrives *after*
 * first paint and every letter is re-measured when it does. Measured on this
 * page that lands about 171ms into the entrance, which is mid-blur: eight
 * glyphs change width, the flex line redistributes them, and every blurred
 * layer is thrown away and re-rasterised. Waiting for `document.fonts.ready`
 * removes an entire class of jank that no amount of cheapening the animation
 * would have touched.
 *
 * The wait is capped. A font that is slow, blocked or missing must not leave
 * the hero sitting empty, and past the cap the swap is a wart on one frame
 * rather than a reason to hold the page hostage.
 *
 * One promise for the whole hero, not one per component. The arc, the wordmark
 * and the lens are three components that never see each other, and the entire
 * effect depends on them sharing a clock — resolving separately they would
 * each start on whichever frame their own effect happened to run.
 */
let pending: Promise<void> | null = null;

/** Long enough for a cached font, short enough not to be a stall. */
const FONT_WAIT_CAP = 450;

export function heroStart(): Promise<void> {
  if (pending) return pending;

  pending = new Promise<void>((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    let settled = false;
    const go = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const cap = window.setTimeout(go, FONT_WAIT_CAP);

    const fonts = document.fonts?.ready ?? Promise.resolve();

    fonts
      .then(
        () =>
          /*
           * One frame after the fonts land, not the same one. `fonts.ready`
           * resolves as a microtask, before the browser has re-laid-out the
           * text that just changed metrics — start here and GSAP reads the
           * *old* geometry and animates toward a layout that is about to move
           * underneath it. The rAF puts us after that reflow.
           */
          new Promise<void>((r) => requestAnimationFrame(() => r())),
      )
      .then(() => {
        window.clearTimeout(cap);
        go();
      })
      .catch(go);
  });

  return pending;
}

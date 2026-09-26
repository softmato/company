/**
 * Turns a letter of the wordmark to glowing liquid while the arc is bright
 * behind it.
 *
 * The look is Magic UI's morphing-text without the morphing: the letter is
 * blurred and its alpha thresholded back to a hard edge (`#hero-melt` in
 * `hero-wordmark.tsx`), which reads as liquid rather than out of focus —
 * corners round, joins bead, strokes swell and thin — while the word stays the
 * word. The blur breathes on its own rhythm per letter, so a lit letter keeps
 * flowing like water instead of sitting still, and a mint glow comes up around
 * it. All three scale with the light actually behind the letter.
 *
 * Driven from `DataPixelArc`'s `onFrame`, sampling the arc's own formula at the
 * frame just drawn. Waits for the wordmark to land (`data-hero-settled`); the
 * entrance owns `filter` until then.
 */

/** Below this the letter is left alone; at `FULL` it is fully liquid. */
const START = 0.5;
const FULL = 0.85;

/**
 * Blur before the threshold, in **em** of the letter: the floor, and how far
 * it breathes. Em, not px, because what decides whether a stroke survives the
 * threshold is blur relative to stroke width. In px, the 4–5px that looks like
 * liquid on the 144px desktop word wiped out the ~3px strokes of the phone-size
 * word entirely — letters vanished mid-word. These are those same px at 9rem.
 */
const BLUR_MIN = 0.011;
const BLUR_SWING = 0.024;

/** Glow radius (em) and opacity at full melt. */
const GLOW = 0.125;
const GLOW_ALPHA = 0.75;

/**
 * How long the melt takes to come up the first time, from the moment the
 * letters land. Without it the lit letters went from sharp type to full
 * liquid in one frame — the entrance hands `filter` over and the melt was
 * already at strength. Eased in, the letters sharpen, hold, then soften.
 */
const INTRO_MS = 1600;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function createLetterMelt() {
  let word: HTMLElement | null = null;
  let settledAt = 0;
  let measuredFor = '';
  let letters: { el: HTMLElement; x: number; ys: number[]; last: string }[] =
    [];

  return (intensityAt: (x: number, y: number) => number, host: HTMLElement) => {
    word ??=
      host.closest('section')?.querySelector<HTMLElement>('.hero-word') ?? null;
    if (!word?.hasAttribute('data-hero-settled')) return;

    /* Letters only move relative to the canvas when the hero resizes. */
    const size = `${host.clientWidth}x${host.clientHeight}`;
    if (size !== measuredFor) {
      measuredFor = size;
      const origin = host.getBoundingClientRect();
      letters = Array.from(
        word.querySelectorAll<HTMLElement>('.hero-letter'),
        (el) => {
          const box = el.getBoundingClientRect();
          const top = box.top - origin.top;
          return {
            el,
            x: box.left - origin.left + box.width / 2,
            ys: [
              top + box.height * 0.25,
              top + box.height * 0.5,
              top + box.height * 0.75,
            ],
            last: '',
          };
        },
      );
    }

    const now = performance.now();
    const seconds = now / 1000;

    settledAt ||= now;
    const intro = smoothstep(Math.min(1, (now - settledAt) / INTRO_MS));

    letters.forEach((letter, index) => {
      const light = Math.max(...letter.ys.map((y) => intensityAt(letter.x, y)));
      const melt =
        smoothstep(Math.min(1, Math.max(0, (light - START) / (FULL - START)))) *
        intro;

      if (melt < 0.03) {
        if (letter.last === '') return;
        letter.last = '';
        letter.el.removeAttribute('data-melt');
        letter.el.style.removeProperty('--melt-blur');
        letter.el.style.removeProperty('--melt-glow');
        letter.el.style.removeProperty('--melt-glow-alpha');
        return;
      }

      /* Two out-of-step waves per letter, so no two letters pulse together. */
      const breath =
        0.5 +
        0.32 * Math.sin(seconds * 2.3 + index * 1.7) +
        0.18 * Math.sin(seconds * 3.7 + index * 0.9);
      const blur = (melt * (BLUR_MIN + BLUR_SWING * breath)).toFixed(4);
      const glow = (melt * GLOW).toFixed(3);
      const alpha = (melt * GLOW_ALPHA).toFixed(2);

      const next = `${blur}|${glow}|${alpha}`;
      if (next === letter.last) return;
      letter.last = next;
      letter.el.setAttribute('data-melt', '');
      letter.el.style.setProperty('--melt-blur', `${blur}em`);
      letter.el.style.setProperty('--melt-glow', `${glow}em`);
      letter.el.style.setProperty('--melt-glow-alpha', alpha);
    });
  };
}

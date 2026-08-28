'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Whether the reader has ever come near this element — a latch, not a state.
 *
 * This is the gate on *mounting* a WebGL scene, which is a different question
 * from `useInView`'s "should it be drawing right now". Creating a canvas costs
 * a GL context and a shader compile whether or not anything is ever drawn with
 * it, and the home page creates three of them.
 *
 * **Measured, because it was not obvious.** Profiling a refresh puts a single
 * 454ms main-thread task at 1.75s — after `load`, and 586ms into the hero's
 * entrance, which is the exact window in which the one animation on the page is
 * running. That was three `<Canvas>` elements booting at once for three
 * sections that are all below the fold. No amount of making the hero cheaper
 * could have covered it; the hero was never the expensive thing.
 *
 * It latches on and never off. Tearing a context down and rebuilding it on
 * every scroll past is both slower and visible, which is the reason
 * `LightFormScene` keeps its canvas mounted and merely stops its frameloop —
 * this only defers the first build, it does not introduce churn.
 *
 * The margin is generous on purpose: a scene that begins compiling exactly as
 * its section crosses the fold arrives late enough to be seen arriving. Most of
 * a viewport of lead time means the work happens while the reader is still
 * looking at something else, which is the whole point.
 *
 * Returns `false` first, unlike `useInView`. That inversion is deliberate and
 * is safe here for the reason `light-form.tsx` already documents: every section
 * paints its own bloom in CSS underneath, so it reads as finished whether the
 * scene arrives, arrives late, or never arrives at all.
 */
export function useNearViewport<T extends HTMLElement>(rootMargin = '80% 0px') {
  const ref = useRef<T>(null);

  /*
   * No observer, no gate: an environment without IntersectionObserver starts
   * latched, so it gets the scene immediately rather than never. The failure
   * mode here has to be "costs more than it should", never "the section is
   * empty".
   *
   * Decided in the initialiser rather than from the effect, because setting
   * state during an effect schedules a second render pass for something that
   * was knowable before the first.
   */
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        /* Latched. Nothing this observer can say afterwards changes anything. */
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, near };
}

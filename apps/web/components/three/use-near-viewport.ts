'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the reader has ever come near this element — a latch, not a state.
 *
 * This is the gate on *mounting* a WebGL scene, which is a different question
 * from `useInView`'s "should it be drawing right now". Creating a canvas costs
 * a GL context and a shader compile whether or not anything is ever drawn with
 * it, and the home page creates one per section that has a form.
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
 *
 * ---
 *
 * **It hands back a callback ref, not a ref object, and that is the whole fix
 * for a bug that kept every light-form on the site from ever appearing.**
 *
 * `LightForm` decides whether WebGL is available with `useSyncExternalStore`,
 * and returns `null` when it is not. During hydration React renders with the
 * *server* snapshot — `false` — so the first client render produces no element
 * at all. Effects run against that commit. With a ref object the effect would
 * find `ref.current === null`, bail out, and never run again: its dependency
 * array has no reason to change when the second render finally mounts the div.
 * Every scene stayed unmounted, on every page, forever — silently, because a
 * missing light-form looks exactly like a light-form that has not arrived yet,
 * and each section paints its own bloom underneath so nothing ever looked
 * broken.
 *
 * A callback ref fires when the node attaches, so the node is state and the
 * observer is set up the moment there is something to observe. Any hook that
 * gates on an element which may not exist on the first render wants this shape;
 * a ref object plus `[]` is a hook that works only when the element is
 * unconditional.
 */
export function useNearViewport<T extends HTMLElement>(rootMargin = '80% 0px') {
  const [node, setNode] = useState<T | null>(null);

  /*
   * No observer, no gate: an environment without IntersectionObserver starts
   * latched, so it gets the scene immediately rather than never. The failure
   * mode here has to be "costs more than it should", never "the section is
   * empty".
   */
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (!node || near || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        /* Latched. Nothing this observer can say afterwards changes anything. */
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [node, near, rootMargin]);

  return { ref: setNode, near };
}

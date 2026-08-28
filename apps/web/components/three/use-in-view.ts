'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Whether the element is near enough to the viewport to be worth drawing.
 *
 * The home page holds three WebGL canvases. Left alone every one of them
 * renders sixty times a second for the whole visit, including the two the
 * reader cannot see — three full scenes' worth of GPU work to draw two things
 * nobody is looking at, on a page whose entire point is that scrolling it feels
 * smooth.
 *
 * `rootMargin` is deliberately generous. A scene that starts rendering exactly
 * as its section crosses the fold arrives a frame or two late and its first
 * frame is visible as a pop; half a viewport of lead time means it is already
 * running by the time anyone can see it.
 *
 * Returns `true` on the server and before the observer's first callback, so the
 * scene renders by default and this can only ever *stop* work that is provably
 * off-screen. A bug here should cost a little battery, never a blank section.
 */
export function useInView<T extends HTMLElement>(rootMargin = '50% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { rootMargin },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

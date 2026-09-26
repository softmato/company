'use client';

import { useEffect, useRef } from 'react';

/**
 * Hands the hero's entrance from CSS to JavaScript.
 *
 * The section is server-rendered with `data-hero-pending`, which marketing.css
 * uses to hide the letters and the staggered copy from the first paint — the
 * server HTML is the *finished* hero, and without this it was painted in full,
 * then blanked when the timelines set their start states, then animated back
 * in. This removes the attribute once those start states are set.
 *
 * It must be the section's **last child**: React runs passive effects in tree
 * order, so by the time this one runs the wordmark's and every `StaggerIn`'s
 * have already put their inline start states on, and all of it lands before
 * the next paint.
 */
export function HeroReady() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.parentElement?.removeAttribute('data-hero-pending');
  }, []);

  return <span ref={ref} hidden />;
}

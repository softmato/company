'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);

  mq.addEventListener('change', onChange);

  return () => mq.removeEventListener('change', onChange);
}

/**
 * True when the reader has *not* asked for reduced motion.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the OS setting
 * is external state, which is exactly what this hook is for. Two things fall
 * out of using it properly —
 *
 *   1. No `setState` inside an effect, so no cascading render on mount.
 *   2. It subscribes to the media query, so a reader who turns reduced motion
 *      on while the page is open gets the still version immediately, without
 *      reloading.
 *
 * The server snapshot is `false`, so the markup that ships is always the
 * motionless one and the animated version is opted into on the client. That is
 * the safe direction: a hydration mismatch here would otherwise mean the
 * server rendered a pinned section that the client does not want.
 *
 * `prefersReducedMotion()` in ./reduced-motion.ts answers the same question
 * outside React, for use inside effects and GSAP callbacks.
 */
export function useMotionEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => false,
  );
}

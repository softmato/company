'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the page has been scrolled far enough for content to have reached
 * the fixed header.
 *
 * The threshold is a few pixels rather than zero so that the rubber-band at
 * the top of a trackpad scroll, and a browser restoring a scroll position of
 * `1`, do not flicker the header's ground on and off.
 *
 * Throttled to a frame, and reads one number — `scrollY` is already computed,
 * so this forces no layout even while Lenis is easing.
 */
export function useScrolled(threshold = 12): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    // Scheduled rather than called here: a reload part-way down the page
    // restores its scroll position after this effect runs.
    schedule();

    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
    };
  }, [threshold]);

  return scrolled;
}

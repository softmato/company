'use client';

import { useEffect, useState } from 'react';

import { DataPixelArc } from '@/components/motion/data-pixel-arc';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import { createLetterMelt } from './hero-melt';
import { heroStart } from './hero-start';

/**
 * The hero's light: ThreeUI's Data Pixel Arc, a dome of lit pixels behind the
 * wordmark, at the founder's configured settings.
 *
 * It replaces the SVG bowl (`hero-arc.tsx`) and the lens on it
 * (`hero-eye.tsx`), whose geometry only made sense on that bowl.
 *
 * Mounted after `heroStart()` — fonts in and one frame laid out — for the same
 * reason every other part of the entrance waits for it (see
 * `hero-entrance-performance`): a canvas that starts drawing during the font
 * swap draws twice. It fades in over the time the old arc took to come up,
 * with `@starting-style`, so the fade costs no JavaScript.
 */
export function HeroPixelArc() {
  const [ready, setReady] = useState(false);
  const [melt] = useState(createLetterMelt);

  useEffect(() => {
    let live = true;
    void heroStart().then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1">
      {ready ? (
        <DataPixelArc
          onFrame={prefersReducedMotion() ? undefined : melt}
          className="opacity-100 transition-opacity duration-900 ease-out starting:opacity-0"
          still={prefersReducedMotion()}
          smooth
          gutter={0.15}
          mode="dark"
          speed={0.79}
          hue={-1}
          saturation={2}
          brightness={1.6}
        />
      ) : null}
    </div>
  );
}

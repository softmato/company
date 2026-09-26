'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import { Drift } from '@/components/motion/drift';
import { Parallax } from '@/components/motion/parallax';
import { cn } from '@/lib/cn';
import { OWN_PRODUCTS } from '@/lib/home/how-we-work';
import { TRUSTED_ART } from '@/lib/home/trusted-art';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

import { TrustedTile, type TrustedSlot } from './trusted-tile';

/**
 * The columns, left to right, measured off the reference: how far each hangs
 * below the top row, in tile heights, and how many tiles it holds. `speed` is
 * its parallax rate — the outer columns rise fastest, so the wall opens up
 * around the copy as the reader scrolls past. The outer two on each side are
 * hidden on phones.
 */
const COLUMNS = [
  { drop: 0.375, tiles: 2, speed: 0.16 },
  { drop: 0, tiles: 2, speed: 0.07 },
  { drop: 0.45, tiles: 1, speed: 0.11 },
  { drop: 0.05, tiles: 1, speed: 0.03 },
  { drop: 0.29, tiles: 1, speed: 0.08 },
  { drop: 0.025, tiles: 1, speed: 0.03 },
  { drop: 0.45, tiles: 1, speed: 0.11 },
  { drop: 0, tiles: 2, speed: 0.07 },
  { drop: 0.375, tiles: 2, speed: 0.16 },
];

/** Which column's top tile each name takes, in turn — either side of the centre first. */
const FEATURE_ORDER = [3, 5, 1, 7, 2, 6, 4, 0, 8];

/** Every tile's content, worked out once: a name where one is due, art in the rest. */
let artIndex = 0;
const SLOTS: TrustedSlot[][] = COLUMNS.map((column, index) => {
  const name = OWN_PRODUCTS[FEATURE_ORDER.indexOf(index)];

  return Array.from({ length: column.tiles }, (_, tile) =>
    tile === 0 && name
      ? { name }
      : { art: TRUSTED_ART[artIndex++ % TRUSTED_ART.length]! },
  );
});

/**
 * The wall of names that closes the page: columns of tiles hanging at
 * different heights on dotted strings, after the founder's testimonial-wall
 * reference, floating free on the page rather than inside a card.
 *
 * It replaced the closing light-form, which lagged. Nothing here is WebGL or
 * a filter. Three motions, each on its own element so they never fight: the
 * column drops in once on arrival, bobs on its own `Drift` clock, and rides
 * the scroll at its own `Parallax` rate. A tile leans toward the pointer.
 * Transforms and opacity only.
 */
export function TrustedWall() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        })
        .from('[data-trusted-col]', {
          y: -90,
          opacity: 0,
          duration: 1.4,
          ease: 'power3.out',
          stagger: { each: 0.08, from: 'center' },
        })
        .from(
          '[data-trusted-string]',
          {
            scaleY: 0,
            duration: 1.2,
            ease: 'power2.out',
            stagger: { each: 0.08, from: 'center' },
          },
          0.5,
        );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="trusted-frame">
      <div className="trusted-wall">
        {COLUMNS.map((column, index) => {
          const slots = SLOTS[index] ?? [];

          return (
            <Parallax
              key={index}
              speed={column.speed}
              className={cn(
                'trusted-col',
                (index < 2 || index > 6) && 'hidden md:block',
              )}
            >
              <Drift
                distance={5 + ((index * 3) % 5) * 2}
                duration={4.6 + ((index * 7) % 5) * 0.55}
              >
                <div
                  data-trusted-col=""
                  className="trusted-stack"
                  style={{ '--drop': column.drop } as CSSProperties}
                >
                  <span aria-hidden="true" className="trusted-tile trusted-ghost" />
                  {slots.map((slot, tile) => (
                    <TrustedTile key={tile} slot={slot} />
                  ))}
                  <span
                    aria-hidden="true"
                    data-trusted-string=""
                    data-lit={slots.some((slot) => 'name' in slot) ? '' : undefined}
                    className="trusted-string"
                  />
                </div>
              </Drift>
            </Parallax>
          );
        })}
      </div>
    </div>
  );
}

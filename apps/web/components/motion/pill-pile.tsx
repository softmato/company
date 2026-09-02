'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * Drops its children into a heap under gravity, once, when it scrolls into
 * view.
 *
 * The reference film's benefits chapter is fifteen coloured pills falling into
 * the bottom of the screen and tumbling to rest. It earns its place because a
 * heap is *not a list*: nothing is first, nothing is ranked, and the reader
 * takes the shape of the pile rather than reading fifteen items. A tidy grid of
 * the same fifteen words would be read, compared, and found to be marketing.
 *
 * Three things this does that a naive Matter.js mount does not:
 *
 *   1. **It measures the real DOM boxes.** Every body is sized from its
 *      element's own `offsetWidth/Height`, so a pill that wraps differently at
 *      a different font size still collides correctly. Hard-coding widths is
 *      what makes these piles look wrong on the one breakpoint nobody checked.
 *   2. **It only ever writes `transform`.** The elements are absolutely
 *      positioned and the simulation sets `translate()` and `rotate()` on them
 *      — no layout is read or written inside the loop.
 *   3. **It sleeps.** `Engine.update` stops being called once every body is
 *      asleep, so a settled pile costs nothing for the rest of the visit. A
 *      physics engine left running at the bottom of a marketing page is a
 *      permanent 60fps main-thread tax for an animation that finished.
 *
 * Reduced motion gets a laid-out pile with no simulation at all: the children
 * are placed on a static staggered grid by CSS and never move. That is a real
 * design, not a degraded one — it is the same heap, already settled.
 *
 * `matter-js` is imported dynamically so it lands in its own chunk and is
 * fetched when this section approaches rather than during first paint. The hero
 * already loses a frame budget to three WebGL canvases; see
 * `components/three/use-near-viewport.ts` for the same reasoning applied there.
 */
export function PillPile({
  children,
  className,
  /** Simulated height. The pile settles against the bottom of this box. */
  height = 420,
}: {
  children: React.ReactNode;
  className?: string | undefined;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;

    if (!root || prefersReducedMotion()) return;

    let cancelled = false;
    let stop: (() => void) | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void start();
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(root);

    async function start() {
      const Matter = await import('matter-js');

      if (cancelled || !root) return;

      const pills = Array.from(
        root.querySelectorAll<HTMLElement>('[data-pill]'),
      );

      if (pills.length === 0) return;

      const width = root.clientWidth;
      const engine = Matter.Engine.create();
      engine.gravity.y = 1.1;

      /*
       * Walls and a floor, thick and placed outside the box. A thin wall lets a
       * fast body tunnel straight through it between two frames, which is how
       * one pill in fifteen ends up on the page's background.
       */
      const WALL = 200;
      const walls = [
        Matter.Bodies.rectangle(width / 2, height + WALL / 2, width * 3, WALL, {
          isStatic: true,
        }),
        Matter.Bodies.rectangle(-WALL / 2, height / 2, WALL, height * 3, {
          isStatic: true,
        }),
        Matter.Bodies.rectangle(
          width + WALL / 2,
          height / 2,
          WALL,
          height * 3,
          {
            isStatic: true,
          },
        ),
      ];

      /*
       * The anchor each pill's `left`/`top` already put it at. The simulation
       * writes a transform *relative to that*, so the `translate(-50%, -50%)`
       * in the stylesheet keeps centring the box on the body's position and the
       * settled fallback layout stays the thing every pill starts from.
       */
      const anchors = pills.map((pill) => ({
        x: pill.offsetLeft,
        y: pill.offsetTop,
      }));

      const bodies = pills.map((pill, index) => {
        const w = pill.offsetWidth;
        const h = pill.offsetHeight;

        return Matter.Bodies.rectangle(
          /*
           * Dropped across the middle 56% of the box, not the whole of it.
           * Spread edge to edge they land side by side in a single flat row —
           * which is a *line* of words, the thing a heap exists not to be.
           * Narrowing the drop makes them collide on the way down and settle
           * two and three deep, which is what reads as a pile.
           */
          width * (0.22 + 0.56 * ((index + 0.5) / pills.length)),
          -120 - index * 90,
          w,
          h,
          {
            chamfer: { radius: h / 2 },
            restitution: 0.32,
            friction: 0.42,
            frictionAir: 0.012,
            angle: (Math.random() - 0.5) * 0.9,
            sleepThreshold: 30,
          },
        );
      });

      Matter.Composite.add(engine.world, [...walls, ...bodies]);

      let frame = 0;
      let previous = performance.now();

      const tick = (now: number) => {
        const delta = Math.min(now - previous, 32);
        previous = now;

        Matter.Engine.update(engine, delta);

        let awake = false;

        bodies.forEach((body, index) => {
          const pill = pills[index];
          const anchor = anchors[index];
          if (!pill || !anchor) return;

          if (!body.isSleeping) awake = true;

          pill.style.transform = `translate(calc(-50% + ${
            body.position.x - anchor.x
          }px), calc(-50% + ${body.position.y - anchor.y}px)) rotate(${body.angle}rad)`;
        });

        /* Settled: stop the loop and hand the compositor its layers back. */
        if (!awake) {
          pills.forEach((pill) => {
            pill.style.willChange = 'auto';
          });
          return;
        }

        frame = requestAnimationFrame(tick);
      };

      pills.forEach((pill) => {
        pill.style.willChange = 'transform';
      });

      frame = requestAnimationFrame(tick);

      stop = () => {
        cancelAnimationFrame(frame);
        Matter.Composite.clear(engine.world, false);
        Matter.Engine.clear(engine);
      };
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      stop?.();
    };
  }, [height]);

  return (
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      style={{ height }}
    >
      {children}
    </div>
  );
}

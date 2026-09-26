'use client';

import createGlobe, { type Marker } from 'cobe';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import { useNearViewport } from './use-near-viewport';

/**
 * A dotted globe that turns on its own and can be dragged round.
 *
 * Magic UI's `globe` on `cobe`, minus `motion`: its spring on the drag was one
 * `useSpring`, and a lerp toward the dragged angle each frame is the same feel
 * in two lines (UI_BRIEF §6).
 *
 * Three things the original does not do, all from the home page's measured
 * performance budget (see `use-near-viewport.ts`):
 * the WebGL context is created only once the card is near the viewport, the
 * render loop stops whenever it is off screen, and the pixel ratio is capped.
 * Under reduced motion it draws one frame and stops.
 *
 * WebGL cannot read a CSS custom property, so the marker colour is resolved
 * from `--glow` on the element at creation.
 */
const DAMPING = 1400;

export function Globe({
  markers,
  className,
}: {
  markers: Marker[];
  className?: string;
}) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const drag = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!near || !canvas) return;

    const still = prefersReducedMotion();
    const css = getComputedStyle(canvas);
    const glow = rgb(css.getPropertyValue('--glow'), [0.07, 0.75, 0.49]);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = canvas.offsetWidth;
    /* Open facing the first marker: cobe measures phi from the antimeridian. */
    const lng = markers[0]?.location[1] ?? 0;
    let phi = Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);
    let eased = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi,
      theta: 0.3,
      dark: 0,
      diffuse: 0.4,
      mapSamples: 16000,
      mapBrightness: 1.2,
      baseColor: [1, 1, 1],
      markerColor: glow,
      glowColor: [1, 1, 1],
      markers,
      onRender: (state) => {
        if (pointer.current === null && !still) phi += 0.004;
        eased += (drag.current - eased) * 0.1;
        state.phi = phi + eased;
        state.width = width * dpr;
        state.height = width * dpr;
      },
    });

    canvas.style.opacity = '1';

    const resize = new ResizeObserver(() => (width = canvas.offsetWidth));
    resize.observe(canvas);

    /* Reduced motion: one frame, then the loop is off for good. */
    const visible = new IntersectionObserver(([entry]) =>
      globe.toggle(!still && !!entry?.isIntersecting),
    );
    if (still) requestAnimationFrame(() => globe.toggle(false));
    else visible.observe(canvas);

    return () => {
      visible.disconnect();
      resize.disconnect();
      globe.destroy();
    };
  }, [near, markers]);

  const move = (x: number) => {
    if (pointer.current === null) return;
    drag.current += (x - pointer.current) / DAMPING;
    pointer.current = x;
  };
  const release = () => {
    pointer.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  };

  return (
    <div ref={ref} className={cn('aspect-square w-full', className)}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="size-full cursor-grab opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
        onPointerDown={(e) => {
          pointer.current = e.clientX;
          e.currentTarget.style.cursor = 'grabbing';
        }}
        onPointerUp={release}
        onPointerOut={release}
        onPointerMove={(e) => move(e.clientX)}
      />
    </div>
  );
}

/** `#rrggbb` → cobe's 0–1 triple; anything else falls back. */
function rgb(value: string, fallback: [number, number, number]) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  if (!m) return fallback;
  return [m[1], m[2], m[3]].map((h) => parseInt(h!, 16) / 255) as [
    number,
    number,
    number,
  ];
}

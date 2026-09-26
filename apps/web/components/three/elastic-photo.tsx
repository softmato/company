'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import type { ElasticEngine } from './elastic-engine';
import { webglSupported } from './webgl-supported';

/** How much larger than the photo the canvas is, per side — room for a bulge. */
const PAD = 0.08;

/**
 * A photograph that stretches like an elastic sheet under the pointer —
 * React Bits' ElasticMesh, on the same terms as `RippleAsset`.
 *
 * It is the plain framed photo until the mouse enters. Only then does it load
 * the engine (and `ogl` with it), build a WebGL context and lay a canvas over
 * the photo; the photo hides once the canvas has drawn its first frame, which
 * is the photo exactly, so the swap is invisible. The sheet leans back and
 * swells toward the pointer while held; when the pointer has left and the
 * sheet is flat again, the context is destroyed and the photo comes back.
 * Nothing runs while the reader is just scrolling.
 *
 * Mouse only and never under reduced motion: on touch there is no hover, and
 * a sheet that grabbed a swipe would fight the page scroll.
 *
 * The photo is the child — the server renders it, and its `currentSrc` (the
 * size the browser already chose and fetched) becomes the texture.
 */
export function ElasticPhoto({
  children,
  radius,
}: {
  children: ReactNode;
  /** Corner radius of the frame, in CSS pixels. */
  radius: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ElasticEngine | null>(null);
  const hovering = useRef(false);
  const [live, setLive] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const mount = mountRef.current;
    const img = box?.querySelector('img');
    if (!live || !box || !mount || !img) return;
    let cancelled = false;

    void import('./elastic-engine').then(({ createElastic }) => {
      if (cancelled) return;
      engineRef.current = createElastic(mount, {
        src: img.currentSrc || img.src,
        pad: PAD,
        radius,
        target: box,
        isHovering: () => hovering.current,
        onDrawn: () => setDrawn(true),
        onIdle: () => {
          setDrawn(false);
          setLive(false);
        },
      });
      /* The pointer may already have gone while the engine was loading. */
      if (!hovering.current) engineRef.current.leave();
    });

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [live, radius]);

  return (
    <div
      ref={boxRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
        if (!webglSupported()) return;
        hovering.current = true;
        setLive(true);
      }}
      onPointerLeave={() => {
        hovering.current = false;
        engineRef.current?.leave();
      }}
    >
      {/*
        While the sheet is drawn the frame keeps only its shadow: the border,
        ground and photo would show round the edge wherever the sheet is pulled
        in toward the pointer.
      */}
      <div
        className={cn(
          'overflow-hidden border shadow-float',
          drawn
            ? 'border-transparent [&_img]:invisible'
            : 'border-border bg-surface',
        )}
        style={{ borderRadius: radius }}
      >
        {children}
      </div>
      <div
        ref={mountRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ inset: `-${PAD * 100}%` }}
      />
    </div>
  );
}

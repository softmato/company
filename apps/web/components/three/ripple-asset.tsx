'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

import type { RippleEngine } from './ripple-engine';

/**
 * An illustration that ripples like water under the pointer — React Bits'
 * RippleDistortion, made cheap enough to put four of on one row.
 *
 * It is a plain `<img>` until the pointer enters. Only then does it load the
 * engine (and `ogl` with it), build a WebGL context and lay a canvas over the
 * image; the image hides once the canvas has drawn its first frame, so the
 * swap is invisible. When the pointer has left and the last ripple has faded,
 * the context is destroyed and the image comes back. At most one card is live
 * at a time in practice, and none while the reader is just scrolling.
 *
 * Mouse only and never under reduced motion: on touch there is no hover to
 * stir it with, and the image is the whole picture anyway.
 *
 * The box takes the image's own aspect ratio, which is what lets the shader
 * map UVs straight across (see `ripple-shaders.ts`). Size it with a width,
 * and give it a position (`relative`, or `absolute` as the discipline cards
 * do) — the canvas is laid over the image with `absolute inset-0`. It sets
 * none itself, because a utility here would beat the caller's component class.
 * The ripple is tinted with `--cobalt`.
 */
export function RippleAsset({
  src,
  width,
  height,
  className,
  style,
}: {
  src: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RippleEngine | null>(null);
  const hovering = useRef(false);
  const [live, setLive] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!live || !box) return;
    let cancelled = false;

    void import('./ripple-engine').then(({ createRipple }) => {
      if (cancelled) return;
      engineRef.current = createRipple(box, {
        src,
        tint: rgb(getComputedStyle(box).getPropertyValue('--cobalt')),
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
  }, [live, src]);

  return (
    <div
      ref={boxRef}
      className={className}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
        hovering.current = true;
        setLive(true);
      }}
      onPointerLeave={() => {
        hovering.current = false;
        engineRef.current?.leave();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        width={width}
        height={height}
        alt=""
        loading="lazy"
        draggable={false}
        className={cn('size-full select-none', drawn && 'invisible')}
      />
    </div>
  );
}

/** `#rrggbb` → a 0–1 triple; anything else falls back to the brand blue. */
function rgb(value: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  if (!m) return [0.15, 0.39, 0.92];
  return [
    parseInt(m[1]!, 16) / 255,
    parseInt(m[2]!, 16) / 255,
    parseInt(m[3]!, 16) / 255,
  ];
}

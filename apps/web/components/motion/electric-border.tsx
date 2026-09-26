'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

/**
 * React Bits' ElectricBorder (after @BalintFerenczy, codepen KwdoyEN), ported
 * to TS with three changes for this page:
 *
 * - `color` may be any CSS colour including `var(--glow)`. The canvas cannot
 *   read a custom property, so the stroke is resolved from the computed
 *   `--electric-border-color` each frame — the theme switch just works.
 * - The loop only runs while the element is on screen. Four of these at 10
 *   noise octaves each is real main-thread work on a page already measured for
 *   scroll jank; off screen it costs nothing.
 * - Reduced motion draws one still frame instead of an animation.
 *
 * The glow layers are built from box-shadow and a gradient, not
 * `filter: blur()` — see rule 3 at the top of marketing.css.
 */

const OCTAVES = 10;
const LACUNARITY = 1.6;
const GAIN = 0.7;
const FREQUENCY = 10;
const DISPLACEMENT = 60;
/* How far the canvas overhangs the element, so displaced strokes are not clipped. */
const OFFSET = 60;

const random = (x: number) => (Math.sin(x * 12.9898) * 43758.5453) % 1;

function noise2D(x: number, y: number) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const a = random(i + j * 57);
  const b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57);
  const d = random(i + 1 + (j + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    a * (1 - ux) * (1 - uy) +
    b * ux * (1 - uy) +
    c * (1 - ux) * uy +
    d * ux * uy
  );
}

function octavedNoise(
  x: number,
  amplitude: number,
  time: number,
  seed: number,
) {
  let y = 0;
  let amp = amplitude;
  let freq = FREQUENCY;
  /* The first octave is flattened to zero, as in the original (baseFlatness 0). */
  for (let i = 0; i < OCTAVES; i++) {
    if (i > 0) y += amp * noise2D(freq * x + seed * 100, time * freq * 0.3);
    freq *= LACUNARITY;
    amp *= GAIN;
  }
  return y;
}

function arcPoint(cx: number, cy: number, r: number, start: number, p: number) {
  const angle = start + (p * Math.PI) / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** A point `t` (0–1) of the way round a rounded rect, clockwise from the top-left. */
function roundedRectPoint(
  t: number,
  l: number,
  tp: number,
  w: number,
  h: number,
  r: number,
) {
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  let d = t * (2 * sw + 2 * sh + 4 * arc);

  if (d <= sw) return { x: l + r + d, y: tp };
  d -= sw;
  if (d <= arc) return arcPoint(l + w - r, tp + r, r, -Math.PI / 2, d / arc);
  d -= arc;
  if (d <= sh) return { x: l + w, y: tp + r + d };
  d -= sh;
  if (d <= arc) return arcPoint(l + w - r, tp + h - r, r, 0, d / arc);
  d -= arc;
  if (d <= sw) return { x: l + w - r - d, y: tp + h };
  d -= sw;
  if (d <= arc) return arcPoint(l + r, tp + h - r, r, Math.PI / 2, d / arc);
  d -= arc;
  if (d <= sh) return { x: l, y: tp + h - r - d };
  d -= sh;
  return arcPoint(l + r, tp + r, r, Math.PI, d / arc);
}

export function ElectricBorder({
  children,
  color = '#5227FF',
  speed = 1,
  chaos = 0.12,
  borderRadius = 24,
  className,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  chaos?: number;
  /** Clamped to half the short side, so a large value on a square draws a circle. */
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;
    let last = 0;
    let frame = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.offsetWidth + OFFSET * 2;
      height = container.offsetHeight + OFFSET * 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle =
        getComputedStyle(container)
          .getPropertyValue('--electric-border-color')
          .trim() || color;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const w = width - 2 * OFFSET;
      const h = height - 2 * OFFSET;
      const r = Math.min(borderRadius, Math.min(w, h) / 2);
      const samples = Math.floor((2 * (w + h) + 2 * Math.PI * r) / 2);

      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const p = i / samples;
        const pt = roundedRectPoint(p, OFFSET, OFFSET, w, h, r);
        const x = pt.x + octavedNoise(p * 8, chaos, time, 0) * DISPLACEMENT;
        const y = pt.y + octavedNoise(p * 8, chaos, time, 1) * DISPLACEMENT;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    const tick = (now: number) => {
      time += ((now - last) / 1000) * speed;
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || still) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();
    draw();

    const resizer = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizer.observe(container);

    const visibility = new IntersectionObserver(([entry]) =>
      entry?.isIntersecting ? start() : stop(),
    );
    visibility.observe(container);

    return () => {
      stop();
      resizer.disconnect();
      visibility.disconnect();
    };
  }, [color, speed, chaos, borderRadius]);

  return (
    <div
      ref={containerRef}
      className={cn('electric-border', className)}
      style={
        {
          '--electric-border-color': color,
          borderRadius,
          ...style,
        } as React.CSSProperties
      }
    >
      <div className="eb-canvas-container">
        <canvas ref={canvasRef} className="eb-canvas" />
      </div>
      <div className="eb-layers" aria-hidden="true">
        <div className="eb-glow-1" />
        <div className="eb-glow-2" />
        <div className="eb-background-glow" />
      </div>
      <div className="eb-content">{children}</div>
    </div>
  );
}

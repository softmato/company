'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

import {
  createDataPixelArcRenderer,
  DATA_PIXEL_ARC_DEFAULTS,
  type DataPixelArcOptions,
} from './data-pixel-arc-renderer';

/**
 * ThreeUI's `DataPixelArcCanvas` (MIT, @designcodeio/threeui — what
 * `<PredictiveArcCanvas variant="data-pixel" />` renders), kept to the source's
 * structure. Differences: the ground is transparent (see the renderer), the
 * package's `.threeui-background` rules are inlined as classes so its 73 KB
 * stylesheet is not needed, and `still` draws one frame and stops — the
 * source's loop would redraw an identical frame forever at `speed` 0.
 *
 * Pauses itself off screen and in a hidden tab.
 */
export function DataPixelArc({
  className,
  still = false,
  onFrame,
  ...props
}: Partial<DataPixelArcOptions> & {
  className?: string;
  still?: boolean;
  /**
   * Called after every drawn frame with a lookup of how lit the arc is at a
   * point in the canvas (CSS px), and the canvas's host element to measure
   * against. Not in the source.
   */
  onFrame?:
    | ((
        intensityAt: (x: number, y: number) => number,
        host: HTMLElement,
      ) => void)
    | undefined;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ ...DATA_PIXEL_ARC_DEFAULTS, ...props });
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    optionsRef.current = { ...DATA_PIXEL_ARC_DEFAULTS, ...props };
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    const renderer = createDataPixelArcRenderer(
      canvas,
      () => optionsRef.current,
    );
    if (!renderer) return undefined;
    let frame = 0;
    let visible = true;
    const loop = () => !still && visible && !document.hidden;
    const draw = () => {
      renderer.render();
      onFrameRef.current?.(renderer.intensityAt, host);
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      renderer.resize(bounds.width, bounds.height);
      draw();
    };
    const tick = () => {
      draw();
      frame = loop() ? requestAnimationFrame(tick) : 0;
    };
    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (loop() && !frame) frame = requestAnimationFrame(tick);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    const visibility = () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (loop() && !frame) {
        frame = requestAnimationFrame(tick);
      }
    };
    observer.observe(host);
    intersection.observe(host);
    document.addEventListener('visibilitychange', visibility);
    resize();
    if (loop()) frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [still]);

  const hue = props.hue ?? DATA_PIXEL_ARC_DEFAULTS.hue;
  const saturation = props.saturation ?? DATA_PIXEL_ARC_DEFAULTS.saturation;

  return (
    <div
      ref={hostRef}
      className={cn('relative size-full overflow-hidden', className)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block size-full"
        style={{ filter: `hue-rotate(${hue}deg) saturate(${saturation})` }}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

/**
 * Draws its SVG strokes on, as if by hand, when it scrolls into view.
 *
 * The reference film annotates its headlines — a scribbled underline under one
 * word, an ellipse around another — and draws every one of those marks rather
 * than fading it in. The difference is the whole effect: a mark that fades on
 * is a graphic, a mark that draws on is somebody's hand.
 *
 * Every `path`, `line`, `polyline` and `circle` inside is drawn in document
 * order with a small overlap. Ours are emerald or ink, never the film's
 * magenta and yellow, and there is at most one mark per section — the film
 * gets away with more because the marks are its brand; here they are punctuation.
 *
 * Finished-by-default, like everything else on this surface: the strokes render
 * complete and DrawSVG collapses them on mount. A failed bundle leaves a drawn
 * mark rather than an invisible one.
 */
export function DrawIn({
  children,
  className,
  duration = 0.9,
  delay = 0,
}: {
  children: ReactNode;
  className?: string | undefined;
  /** Seconds per stroke. */
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const strokes = el.querySelectorAll('path, line, polyline, circle, ellipse');

    if (strokes.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        strokes,
        { drawSVG: '0%' },
        {
          drawSVG: '100%',
          duration,
          delay,
          ease: 'power2.inOut',
          stagger: duration * 0.55,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, duration]);

  return (
    <span ref={ref} aria-hidden="true" className={cn('block', className)}>
      {children}
    </span>
  );
}

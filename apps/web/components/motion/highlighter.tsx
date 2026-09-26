'use client';

import { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';
import type { RoughAnnotationType } from 'rough-notation/lib/model';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * A marker stroke drawn over a phrase the first time it scrolls into view.
 *
 * Magic UI's `highlighter`, with three changes:
 *
 *   - **No `motion`.** It only supplied `useInView`, and UI_BRIEF §6 rules out
 *     a second animation library for that — one IntersectionObserver does it.
 *   - **No ResizeObserver on `document.body`.** rough-notation already redraws
 *     itself, unanimated, when the phrase's line boxes move. The original's
 *     extra observer replayed the stroke every time anything on the page
 *     changed height, which on this page is every time a section mounts.
 *   - **`inline`, not `inline-block`.** A phrase that cannot wrap jumps to the
 *     next line whole on a phone; `multiline` draws one stroke per line box.
 *
 * Colours are tokens so the stroke follows the theme. The stroke is set as an
 * SVG presentation attribute, which resolves `var()` like any CSS value.
 *
 * The margin holds the stroke back until the phrase is well up the screen —
 * under `ToneReveal` that is roughly where the scrub has finished brightening
 * the words, so the mark lands on full-contrast text rather than grey.
 */
const DEFAULT_COLOR: Partial<Record<RoughAnnotationType, string>> = {
  highlight: 'color-mix(in oklab, var(--glow) 26%, transparent)',
  underline: 'var(--primary)',
};

export function Highlighter({
  children,
  action = 'highlight',
  color = DEFAULT_COLOR[action] ?? 'var(--primary)',
  strokeWidth = 2,
  animationDuration = 700,
  iterations = 2,
  padding = 2,
}: {
  children: React.ReactNode;
  action?: RoughAnnotationType;
  color?: string;
  strokeWidth?: number;
  /** Milliseconds for the whole stroke, split across line boxes by width. */
  animationDuration?: number;
  iterations?: number;
  padding?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const annotation = annotate(el, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline: true,
      animate: !prefersReducedMotion(),
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        annotation.show();
        observer.disconnect();
      },
      { rootMargin: '0px 0px -35% 0px' },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      annotation.remove();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, padding]);

  return (
    <span ref={ref} className="relative">
      {children}
    </span>
  );
}

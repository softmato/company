'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

/**
 * Drifts its children against the scroll.
 *
 * Used for the 3D assets and photo cards that slide through the reference at
 * their own speeds — the depth cue comes from things moving at different
 * rates, so vary `speed` between neighbouring elements rather than setting all
 * of them to the same value.
 *
 * `speed` is a fraction of the trigger's scrolled distance: 0.2 moves the
 * element a fifth as far as the page, negative values move it the other way.
 */
export function Parallax({
  children,
  speed = 0.2,
  className,
  style,
}: {
  children: ReactNode;
  speed?: number;
  className?: string | undefined;
  /**
   * For placement the caller cannot express in a class — a satellite pinned to
   * a percentage of its host's height, say. GSAP only ever writes `transform`
   * here, so anything set through this survives the tween.
   */
  style?: React.CSSProperties | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      gsap.to(el, {
        /*
         * Expressed against the viewport rather than the element: the distance
         * a fixed-height element travels should not depend on how tall it
         * happens to be, or a tall blob and a short one at the same `speed`
         * visibly disagree about how far away they are.
         */
        y: () => -(window.innerHeight * speed),
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          /* Recomputed on resize, since `y` is a function of viewport height. */
          invalidateOnRefresh: true,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return (
    <div ref={ref} className={cn('will-change-transform', className)} style={style}>
      {children}
    </div>
  );
}

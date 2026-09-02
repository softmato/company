'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import {
  ScrollTrigger,
  gsap,
  registerMotionPlugins,
} from '@/lib/motion/register';

/**
 * Floats its child up and down, forever, on its own clock.
 *
 * For arrangements that are meant to read as objects suspended in space rather
 * than as a diagram — the craft discs under the opening statement. A scatter
 * that never moves reads as a picture of a scatter; a slow bob is what makes
 * the eye accept the different heights as depth instead of as a layout bug.
 *
 * The point is that neighbours must not agree. Give each one a different
 * `distance` and `duration` and they drift apart within a cycle and never
 * resynchronise, which is what keeps four circles from looking mechanical.
 * Same `duration` on all of them and you have a carousel.
 *
 * Only `y` is touched, on a wrapper of its own, so this composes with an
 * entrance animating the parent (see `StaggerIn`) — two tweens on one
 * element's transform fight, two tweens on nested elements do not.
 *
 * The tween is paused while the section is off screen. An infinite repeat is a
 * rAF callback for the life of the page otherwise, and there are four of them.
 */
export function Drift({
  children,
  distance = 12,
  duration = 7,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Travel in pixels, from rest to the top of the bob. */
  distance?: number;
  /** Seconds for half a cycle. */
  duration?: number;
  delay?: number;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      const float = gsap.to(el, {
        y: -distance,
        duration,
        delay,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        paused: true,
      });

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) float.play();
          else float.pause();
        },
      });
    }, el);

    return () => ctx.revert();
  }, [distance, duration, delay]);

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}

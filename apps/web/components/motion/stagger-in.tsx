'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

/**
 * The elements this can render. Narrow on purpose: the effect animates direct
 * children, so the tag has to be one that legitimately holds a set of peers.
 */
type StaggerTag = 'div' | 'ul' | 'ol';

/**
 * Fades its direct children up, one after another.
 *
 * The reference's hero settles in a strict order — light, then name, then the
 * line, then the button, then the small print — and the whole effect of that
 * order is lost if the copy arrives while the light is still expanding. So
 * this takes a `delay` and is given one long enough to sit behind the arc.
 *
 * Direct children rather than a list of refs, so a section can reorder its own
 * copy without the animation needing to hear about it. Only `opacity` and
 * `transform` are touched: those two composite on the GPU and never trigger
 * layout, which is what keeps a stagger running under a scroll smooth.
 *
 * The children ship with their final styling. GSAP dims them on mount and
 * animates them back, so a failed or slow bundle leaves a finished hero rather
 * than an invisible one.
 */
export function StaggerIn({
  children,
  as = 'div',
  delay = 0,
  onScroll = false,
  className,
}: {
  children: ReactNode;
  /**
   * Use `ul` when the children are a list. Wrapping list items in a `div` for
   * the sake of an animation costs the reader the list semantics — and with
   * them the "list of 5 items" a screen reader would have announced.
   */
  as?: StaggerTag;
  delay?: number;
  /**
   * Wait until the block is in view rather than playing on mount. Anything
   * below the fold wants this: an entrance that has already finished by the
   * time the reader arrives is an entrance nobody saw.
   */
  onScroll?: boolean;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        Array.from(el.children),
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay,
          ease: 'power3.out',
          stagger: 0.12,
          /*
           * `once: true`. These are arrivals, not scrubbed effects — replaying
           * them every time the reader scrolls back up makes a long page feel
           * like it is constantly rebuilding itself.
           */
          ...(onScroll
            ? { scrollTrigger: { trigger: el, start: 'top 82%', once: true } }
            : {}),
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, onScroll]);

  /*
   * Narrowed to one concrete tag for the type-checker's benefit. Every member
   * of StaggerTag renders an HTMLElement and takes the same two props used
   * here, so the cast is safe for all of them.
   */
  const Tag = as as 'div';

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}

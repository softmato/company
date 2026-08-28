'use client';

import { useEffect, useRef, type ReactNode, type Ref } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins, SplitText } from '@/lib/motion/register';

/**
 * The headline entrance from the reference's hero and closing panel: lines
 * resolve out of a blur, rising slightly, one after the other.
 *
 * Split by line rather than by word — this is an arrival, and a whole line
 * settling reads as one gesture where nine separate words read as noise. The
 * per-word treatment is `WordReveal`, and the two should not be used on the
 * same headline.
 *
 * Lines are re-split on resize because line breaks move with the container;
 * without it, a headline that reflows keeps the old, now-wrong line boxes.
 *
 * The caller supplies the type class — `.headline` or `.display`. This used to
 * force `.headline` itself, which meant a caller wanting display type had two
 * conflicting rules on one element and was relying on their order in the
 * stylesheet to settle it. Passing it in makes the choice visible at the call
 * site, which is where it belongs.
 */
/** See the note on the same type in word-reveal.tsx. */
type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';

export function BlurIn({
  children,
  as = 'h1',
  className,
  delay = 0,
}: {
  children: ReactNode;
  as?: TextTag;
  className?: string | undefined;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    let split: InstanceType<typeof SplitText> | null = null;

    const ctx = gsap.context(() => {
      split = new SplitText(el, {
        type: 'lines',
        linesClass: 'overflow-hidden',
        aria: 'auto',
        /* Re-split on resize; the callback re-runs the animation's setup. */
        autoSplit: true,
        onSplit: (self: InstanceType<typeof SplitText>) =>
          gsap.fromTo(
            self.lines,
            { autoAlpha: 0, y: 28, filter: 'blur(14px)' },
            {
              autoAlpha: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 1.1,
              delay,
              ease: 'power3.out',
              stagger: 0.14,
            },
          ),
      });
    }, el);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [delay]);

  const Tag = as as 'h1';

  return (
    <Tag ref={ref as Ref<HTMLHeadingElement>} className={cn(className)}>
      {children}
    </Tag>
  );
}

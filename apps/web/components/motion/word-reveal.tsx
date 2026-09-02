'use client';

import { useEffect, useRef, type ReactNode, type Ref } from 'react';

import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins, SplitText } from '@/lib/motion/register';

/**
 * The signature effect of the reference: a headline whose words turn from
 * washed-out to full contrast one at a time as the section scrolls past.
 *
 * Scrubbed rather than played — the reveal is tied to scroll position, so
 * scrolling back up un-reveals it. A played-once version drifts out of sync
 * with the reader the moment they scroll up, which on a long headline is very
 * visible.
 *
 * The dimmed colour is applied here in `useEffect`, never in CSS. The markup
 * ships at full contrast, so a reader who never gets the bundle — or gets it
 * late — sees a finished headline rather than a grey one. See the note at the
 * top of marketing.css.
 *
 * The caller supplies the type class — `.headline` or `.display`. See the same
 * note on `BlurIn`.
 */
/**
 * Deliberately narrow. A fully polymorphic `as` collapses this component's ref
 * type to `never` under TypeScript, and the effect needs a real element
 * reference — these are the tags a headline is ever set in.
 */
type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';

export function WordReveal({
  children,
  as = 'h2',
  tone = 'light',
  className,
  stagger = 0.6,
}: {
  children: ReactNode;
  /** Rendered element. Use the real heading level — this is a text effect. */
  as?: TextTag;
  /** Which band it sits on; picks the colour it fades up from. */
  tone?: 'light' | 'dark';
  className?: string | undefined;
  /**
   * Overlap between consecutive words, 0–1. Lower reveals words in a tighter
   * sequence, higher lets several brighten at once. 0.6 matches the reference.
   */
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const dim =
      tone === 'dark' ? 'rgba(245,244,248,0.22)' : 'rgba(16,16,28,0.20)';
    /*
     * Resolved before the split so it survives it: SplitText rewrites the
     * element's children, and reading the computed colour afterwards can pick
     * up the dimmed value we are about to set.
     */
    const full = getComputedStyle(el).color;

    let split: InstanceType<typeof SplitText> | null = null;

    /*
     * `gsap.context` scopes every tween and ScrollTrigger created inside it so
     * `revert()` cleans up all of them — including the ScrollTriggers, which
     * are global and would otherwise survive an unmount and keep firing
     * against a detached node.
     */
    const ctx = gsap.context(() => {
      split = new SplitText(el, {
        type: 'words',
        wordsClass: 'reveal-word',
        /* Keeps screen readers reading the sentence, not 9 separate words. */
        aria: 'auto',
      });

      gsap.fromTo(
        split.words,
        { color: dim },
        {
          color: full,
          ease: 'none',
          stagger: { each: stagger, from: 'start' },
          scrollTrigger: {
            trigger: el,
            /*
             * Starts once the headline is well inside the viewport and ends
             * before it leaves, so the last word lands while the reader can
             * still see it rather than as it clears the top of the screen.
             */
            start: 'top 85%',
            end: 'bottom 55%',
            scrub: 0.6,
          },
        },
      );
    }, el);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [tone, stagger]);

  /*
   * Narrowed to one concrete tag for the type-checker's benefit. Every member
   * of TextTag renders an HTMLElement and takes the same two props used here,
   * so the cast is safe for all of them.
   */
  const Tag = as as 'h2';

  return (
    <Tag ref={ref as Ref<HTMLHeadingElement>} className={cn(className)}>
      {children}
    </Tag>
  );
}

'use client';

import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

import { HERO } from './hero-timing';

/**
 * The company name across the hero: one flat line of widely-tracked letters,
 * resolving out of a blur from the middle outward.
 *
 * **The baseline is flat, and that is the whole point.** The previous build
 * placed each letter at its own point on the arc's circle, so the word swung
 * 242px down and back up across eight glyphs. The reference does the opposite:
 * every letter is upright and level, and the curve — an entirely separate,
 * much larger light-form — passes behind them, crossing the row between the
 * second and third letters and again between the sixth and seventh. Text on a
 * curved path is the one thing this hero must not do.
 *
 * Tracking comes from `justify-content: space-between` rather than a
 * `letter-spacing` value. The reference's wordmark reaches both edges of the
 * viewport at every width, which a fixed tracking cannot do — it either
 * overflows on a phone or leaves the word huddled in the middle of a wide
 * display. Distributing the letters means the line is edge-to-edge by
 * construction and the only thing left to size is their height.
 *
 * The entrance is a **focus pull**, not a fade. In the reference the letters
 * arrive as unreadable white smudges and sharpen in place — at one second in,
 * three of the five glyphs are still blobs. A blur is what makes the light
 * appear to be resolving them; opacity alone reads as text being switched on.
 *
 * `from: 'center'` on the stagger because the arc's two bright heads travel
 * outward from the bottom of the bowl. A left-to-right stagger here would
 * visibly disagree with the light that is supposed to be causing it.
 */
export function HeroWordmark({ name = 'Softmato' }: { name?: string }) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const ctx = gsap.context(() => {
      const stagger = { each: HERO.letters.stagger, from: 'center' as const };

      /*
       * The arrival. Opacity only, and quick — by the end of this the letters
       * are at *full brightness* and still completely out of focus, which is
       * the state the reference holds for the better part of a second. Rolling
       * this into the focus pull, which is what one long tween did, means the
       * glyphs are half-transparent for exactly as long as they are blurred,
       * and a dim blur is a grey smear where a bright one is a bubble of
       * light.
       */
      gsap.fromTo(
        '.hero-letter',
        { opacity: 0, filter: 'blur(24px)', scale: 1.22 },
        {
          opacity: 1,
          duration: HERO.letters.rise.duration,
          delay: HERO.letters.rise.at,
          ease: 'power2.out',
          stagger,
        },
      );

      /*
       * The pull. A full second, and it starts late — edge energy in the
       * reference's wordmark band bottoms out at 0.87s and does not recover
       * its settled value until 1.9s. Nothing about this is fast, and every
       * earlier attempt at it was.
       */
      gsap.to('.hero-letter', {
        filter: 'blur(0px)',
        scale: 1,
        duration: HERO.letters.focus.duration,
        delay: HERO.letters.focus.at,
        ease: 'power2.inOut',
        stagger,
        /*
         * Drop the filter once it lands. A `blur(0px)` left on the element
         * still costs an offscreen pass on every subsequent paint, which is a
         * permanent tax on scrolling for an effect that finished in the first
         * two seconds.
         */
        clearProps: 'filter',
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    /*
      One label on the wrapper, every letter hidden. A screen reader handed
      eight separate spans reads the company name out one letter at a time.
      `role="img"` is what makes the label legal — ARIA ignores `aria-label` on
      a bare span, which is the letter-by-letter reading again.
    */
    <span ref={root} role="img" aria-label={name} className="hero-word">
      {[...name.toUpperCase()].map((letter, index) => (
        /* Letters repeat in "SOFTMATO"; the position is the identity. */
        <span key={`${letter}-${index}`} aria-hidden="true" className="hero-letter">
          {letter}
        </span>
      ))}
    </span>
  );
}

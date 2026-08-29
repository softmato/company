'use client';

import { Fragment, useEffect, useRef, type Ref } from 'react';

import { cn } from '@/lib/cn';
import type { ToneSentence } from '@/lib/home/tone';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins } from '@/lib/motion/register';

/**
 * A two-tone headline whose words brighten to their final tone as it scrolls.
 *
 * This is `WordReveal` and the film's alternating-tone sentence in one
 * component, and they have to be one component: `WordReveal` animates every
 * word to the *same* colour, read once off the element, so a headline with
 * quiet words in it comes out uniformly dark the moment the scrub reaches the
 * end. Each word here carries its own destination instead.
 *
 * Three things it does deliberately:
 *
 *   1. **It splits the words itself** rather than using SplitText. The sentence
 *      arrives as data with tones attached, so the split is already done — and
 *      SplitText would rewrite the spans that carry the tones.
 *   2. **The markup ships finished.** Every word renders at its final tone and
 *      GSAP dims it on mount. A reader who never gets the bundle sees a
 *      headline, not a grey one. Same rule as the rest of `marketing.css`.
 *   3. **It reads each word's destination colour before dimming anything.**
 *      Reading afterwards picks up the value we just set, which is the bug that
 *      makes a scrub end on the wrong colour.
 *
 * Word boxes are `inline-block`, so a word never breaks mid-animation; the
 * space between them is a real text node so the line still wraps normally.
 */
type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'div';

export function ToneReveal({
  sentence,
  as = 'h2',
  tone = 'light',
  className,
  stagger = 0.5,
}: {
  sentence: ToneSentence;
  as?: TextTag;
  /** Which ground it sits on; picks the colour the words fade up from. */
  tone?: 'light' | 'dark';
  className?: string | undefined;
  /** Overlap between consecutive words, 0–1. 0.5 matches the reference. */
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    registerMotionPlugins();

    const words = Array.from(
      el.querySelectorAll<HTMLElement>('[data-tone-word]'),
    );

    if (words.length === 0) return;

    /* Destinations first — see note 3 above. */
    const destinations = words.map((word) => getComputedStyle(word).color);
    const from = tone === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(6,20,15,0.14)';

    const ctx = gsap.context(() => {
      words.forEach((word, index) => {
        const destination = destinations[index];

        if (!destination) return;

        gsap.fromTo(
          word,
          { color: from },
          {
            color: destination,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              end: 'bottom 58%',
              scrub: 0.6,
            },
            /*
             * The stagger is expressed as a delay rather than through
             * `stagger:` because each word is its own tween — they have
             * different destinations and cannot share one.
             */
            delay: index * stagger,
          },
        );
      });
    }, el);

    return () => ctx.revert();
  }, [sentence, stagger, tone]);

  const Tag = as as 'h2';
  const dimClass = tone === 'dark' ? 'tone-dim-invert' : 'tone-dim';

  return (
    <Tag ref={ref as Ref<HTMLHeadingElement>} className={cn(className)}>
      {sentence.map((segment, segmentIndex) => (
        <Fragment key={`${segment.text}-${segmentIndex}`}>
          {segment.text.split(' ').map((word, wordIndex) => (
            <Fragment key={`${word}-${wordIndex}`}>
              <span
                data-tone-word=""
                className={cn(
                  'inline-block',
                  segment.tone === 'dim' ? dimClass : undefined,
                )}
              >
                {word}
              </span>{' '}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </Tag>
  );
}

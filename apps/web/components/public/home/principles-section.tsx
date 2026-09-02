import { DrawIn } from '@/components/motion/draw-in';
import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkUnderline } from '@/components/public/marks';
import { PRINCIPLES_HEADING } from '@/lib/home/sentences';
import { PRINCIPLES } from '@/lib/home/statements';

import { QualityPile } from './quality-pile';

/**
 * What we believe, over a heap of the words that follow from it.
 *
 * **The pile replaces the eclipse.** This section used to be a WebGL light-form
 * with three cards under it, which is the first reference film's shape and a
 * good one — but it was the third luminous object in five sections, and by then
 * the effect had stopped being an event. The second film puts a physics drop
 * here instead: fifteen coloured pills falling into the bottom of the screen
 * and settling in whatever heap they land in. It earns the position because a
 * heap is *not a list* — nothing is first, nothing is ranked, and the reader
 * takes the shape of it rather than reading fourteen items. Fourteen adjectives
 * in a tidy grid would be read, compared, and correctly identified as
 * marketing.
 *
 * The three principles keep their cards. They are the part with an argument in
 * them and the part that has to survive being read slowly; the pile above is
 * the part that has to survive being scrolled past.
 *
 * `MarkUnderline` runs under one word of the heading — the film scribbles over
 * two or three words per headline, but its marks are its brand where ours are
 * punctuation, so there is one on this page and one on the close.
 */
export function PrinciplesSection() {
  return (
    <section className="stage px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
      <div
        className="bloom opacity-45"
        style={
          { '--bloom-x': '50%', '--bloom-y': '70%' } as React.CSSProperties
        }
      />

      <div className="mx-auto w-full max-w-6xl">
        {/*
          A rem measure, not `ch`. `ch` resolves against the element it is set
          on, and this wrapper is at body size while the heading inside it is
          four times that — `max-w-[22ch]` here is 176px, which turned a
          six-word heading into a column of single words. Measures in `ch` only
          go on the element whose font they are meant to measure.
        */}
        <div className="mx-auto max-w-[40rem] text-center">
          <p className="eyebrow">What we believe</p>

          <span className="relative mt-6 block">
            <ToneReveal
              sentence={PRINCIPLES_HEADING}
              className="headline mx-auto max-w-[16ch] text-[clamp(2rem,5.2vw,3.75rem)] leading-[1.06]"
            />
            {/*
              The mark is sized and placed against the word "right," which sits
              at the end of the second visual line at every width the heading
              takes. Anchored to the heading block rather than wrapped around
              the word itself: wrapping it would put a positioned element inside
              the run that `ToneReveal` splits.
            */}
            <DrawIn
              className="pointer-events-none absolute inset-x-[18%] top-[46%] h-4 text-primary"
              delay={0.35}
            >
              <MarkUnderline />
            </DrawIn>
          </span>
        </div>

        <div className="mt-14">
          <QualityPile />
        </div>

        <StaggerIn onScroll className="mt-12 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <article key={principle.title} className="section-frame p-6">
              <h3 className="headline text-[18px]">{principle.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                {principle.body}
              </p>
            </article>
          ))}
        </StaggerIn>
      </div>
    </section>
  );
}

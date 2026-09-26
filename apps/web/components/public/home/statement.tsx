import Link from 'next/link';

import { DrawIn } from '@/components/motion/draw-in';
import { SectionCursor } from '@/components/motion/section-cursor';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkSpark } from '@/components/public/marks';
import { STATEMENT } from '@/lib/home/sentences';

import { WorkAvatar } from './work-avatar';
import { WorkFloaters } from './work-floaters';
import { WorkShowcase } from './work-showcase';

/**
 * The first thing under the hero: "How we work", laid out after the founder's
 * hiring-site reference — a centred headline with one word on a solid green
 * block, a two-line lede and one button, small cards floating in the margins,
 * and cards stacked on a curved horizon underneath. Flat white ground, no
 * bloom: the reference is clean, and the cards are the colour.
 *
 * **It tells one story, readable at a glance** (the founder's brief): a client
 * asks for a change to their website or app, the engineer answers with the
 * plan, and it goes live. Ask and answer float either side of the headline
 * (`WorkFloaters`); the live result sits on the horizon beside the client
 * portal at agency.softmato.com, where every project is followed as the
 * engineers post updates (`WorkShowcase`). Every card leads with a picture — a drawn
 * checkout with the real wallet marks, a file, a face — and uses as few words
 * as it can.
 *
 * **What the reference has that this does not:** photographs, names,
 * headcounts, salaries, client logos and a review score. Each is a claim about
 * the business; see `lib/home/how-we-work.ts` for what replaces each one.
 *
 * The sentence is one `<h2>`. Three headings for what is one sentence broken
 * for rhythm puts three entries in a screen reader's heading list.
 *
 * No light-form here on purpose: this section sits directly under the hero's
 * arc, and a second luminous form right below the first reads as the same
 * section continuing.
 */
export function Statement() {
  return (
    <section className="stage hero-seam px-6 pb-20 pt-28 sm:pt-36 lg:pb-0">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative lg:py-6">
          <WorkFloaters />

          <div className="relative mx-auto flex max-w-[40rem] flex-col items-center text-center">
            <div className="flex items-start gap-3">
              <p className="eyebrow pt-1">How we work</p>
              <DrawIn className="text-primary">
                <MarkSpark className="size-6" />
              </DrawIn>
            </div>

            <ToneReveal
              sentence={STATEMENT}
              className="display mt-7 max-w-[19ch] text-balance text-[clamp(2.25rem,4.6vw,3.9rem)]"
            />

            <p className="mt-7 max-w-[44ch] text-[16px] leading-relaxed text-muted-foreground">
              Tell us what your website or app needs. The engineer who builds it
              answers you, and your own portal shows every project as it moves.
            </p>

            <Link
              href="/contact"
              className="mt-9 inline-flex h-12 items-center rounded-full bg-foreground px-7 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Get in touch
            </Link>
          </div>
        </div>

        <WorkShowcase />
      </div>

      {/*
        The reader's own pointer, drawn as the client's cursor: in this section
        they are the "You" who asked. Mouse only; see SectionCursor.
      */}
      <SectionCursor
        arrow={
          <svg
            viewBox="0 0 20 20"
            className="-ml-1 -mt-1 size-[30px] drop-shadow-sm"
          >
            <path
              d="M2.5 2 17 8.2l-6.1 1.9-2 6.1z"
              className="fill-foreground stroke-card"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </svg>
        }
        label={
          <span className="ml-5 mt-7 flex items-center gap-2">
            <WorkAvatar who="client" className="size-9" />
            <span className="rounded-lg bg-foreground px-3 py-1.5 text-[14px] font-medium text-background shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)]">
              You
            </span>
          </span>
        }
      />
    </section>
  );
}

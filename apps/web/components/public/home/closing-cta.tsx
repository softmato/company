import Link from 'next/link';

import { DrawIn } from '@/components/motion/draw-in';
import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkArrow, MarkCircle } from '@/components/public/marks';
import { LightForm } from '@/components/three/light-form';
import { CLOSING_HEADING } from '@/lib/home/sentences';

import { DarkNavZone } from './dark-nav-zone';

/**
 * The closing chapter: a question, one action, and nothing else on the screen.
 *
 * **It is dark now, and that is the change.** Both reference films close on
 * black — the page opens on a band of night, spends its middle in the light,
 * and returns to the ground it started from. The second film does it twice
 * (products, then the close) and gets away with it because every dark panel has
 * a large top radius and slides up over the light behind it. A hard edge at the
 * same two positions is what reads as stripes. See `.band-dark`.
 *
 * A question rather than a statement, and one the reader can answer with yes or
 * no rather than one that assumes the answer. That is the difference between an
 * invitation and a sales line.
 *
 * The arc from the hero returns here, upside down, closing the page on the
 * shape it opened with. Drawn straight rather than animated: this is a reprise,
 * and a second full performance of the hero's entrance at the foot of the page
 * competes with the button it is supposed to be framing.
 *
 * **The form in the bowl.** The lower half of this section was empty — the
 * question and the button sit at the top and the arc closes it at the bottom,
 * with a screen of nothing between them. It now holds the page's last
 * light-form: four surfaces turning on a carousel — a website, an app, a
 * product, an artboard — each coming to the front in turn and never stopping.
 *
 * Every other form on this page is a metaphor, and one screen above a contact
 * button a metaphor is the wrong instrument. The most persuasive object
 * available at the foot of a marketing page is the work, and all four things
 * this company sells happen to have a shape a reader recognises before they
 * read it. See `components/three/forms/showcase.tsx`.
 *
 * The form is given its own box rather than the section's — `LightForm`'s camera
 * looks at the middle of whatever box it is handed, so placing the box is how a
 * form is placed. This one starts below the copy and ends inside the arc, so the
 * bowl frames it.
 */
export function ClosingCta() {
  return (
    <section className="stage band-dark band-dark-end dark px-6 pb-40 pt-28 sm:pb-56 sm:pt-40">
      <div
        className="bloom opacity-55"
        style={
          { '--bloom-x': '50%', '--bloom-y': '84%' } as React.CSSProperties
        }
      />
      <DarkNavZone />

      {/*
        `ground="dark"` is load-bearing: the default rig keys the form from
        behind into a silhouette, which on this near-black band is a black object
        on a black ground. See the note in `light-form-scene.tsx`.
      */}
      <LightForm
        kind="showcase"
        ground="dark"
        className="absolute inset-x-0 bottom-[6%] top-[58%]"
      />

      <div className="mx-auto w-full max-w-4xl text-center">
        <span className="relative block">
          <ToneReveal
            sentence={CLOSING_HEADING}
            tone="dark"
            as="h2"
            className="headline mx-auto max-w-[18ch] text-[clamp(2rem,5.5vw,4rem)] leading-[1.08] text-white"
          />
          {/*
            One circled word to close on, matching the underline at the
            principles section. Anchored to the block rather than wrapped around
            a word, for the same reason as that one: ToneReveal splits the run
            it is given, and a positioned element inside that run moves with the
            split.
          */}
          <DrawIn
            className="pointer-events-none absolute inset-x-[20%] bottom-[-6%] h-16 text-[color:var(--glow)]"
            delay={0.4}
          >
            <MarkCircle />
          </DrawIn>
        </span>

        <StaggerIn onScroll delay={0.2} className="mt-16">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="pill-cta pill-solid">
              Tell us about it
            </Link>
            <Link href="/services" className="pill-cta pill-quiet">
              What we take on
            </Link>
          </div>

          <p className="mt-8 text-[14px] text-white/60">
            We read every message ourselves. No form goes to an inbox nobody
            opens.
          </p>

          <Link
            href="/contact"
            className="link-arrow mt-10 justify-center text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
          >
            <span>Three questions, then a real reply</span>
            <MarkArrow className="size-5" />
          </Link>
        </StaggerIn>

        {/* The reprise. Inverted — the hero's bowl becomes a dome. */}
        <svg
          viewBox="0 0 1200 200"
          aria-hidden="true"
          className="mt-24 w-full opacity-70"
        >
          <path
            d="M 90 190 A 520 520 0 0 1 1110 190"
            fill="none"
            stroke="var(--glow-core)"
            strokeWidth="24"
            strokeOpacity="0.12"
            strokeLinecap="round"
          />
          <path
            d="M 90 190 A 520 520 0 0 1 1110 190"
            fill="none"
            stroke="var(--glow)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  );
}

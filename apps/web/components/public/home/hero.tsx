import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';

import { DarkNavZone } from './dark-nav-zone';
import { HeroArc } from './hero-arc';
import { HeroEye } from './hero-eye';
import { HERO } from './hero-timing';
import { HeroWordmark } from './hero-wordmark';

/**
 * The home hero: one band of night on a light site, with the company name
 * across it and a bowl of light opening behind.
 *
 * **Why this section is dark when the rest of the product is not.** The effect
 * the reference gets is a light-form — the brightest object on the screen,
 * with the darkness around it doing half the work. On a white ground there is
 * no headroom above the background to be brighter than, so the same arc
 * rendered light stops being light and becomes a green ribbon. Rather than
 * give the whole site back to the dark build, the night is scoped to the one
 * section that needs it: `.dark` here swaps the token palette for everything
 * inside, `DarkNavZone` carries that fact to the fixed header, and the page
 * below stays on the light palette the founder asked for.
 *
 * The order of arrival matters more than any single piece of it, and it lives
 * in `hero-timing.ts` rather than as four hand-tuned delays: light, then name,
 * then the line, then the buttons. Starting the copy while the arc is still
 * opening turns four deliberate gestures into one busy one.
 *
 * The line under the name is a tagline, not the page title — the wordmark
 * already spells the name, and repeating it underneath is the one thing that
 * makes a name-as-light-form look like a mistake. The body's first paragraph
 * becomes the small print under the buttons.
 *
 * The bloom is painted in CSS underneath, so the section is a finished picture
 * before the arc's JavaScript has run and stays one if it never does.
 */
export function Hero({
  tagline,
  lede,
}: {
  tagline: string;
  lede?: string | null;
}) {
  return (
    <section className="stage dark hero-band flex min-h-[100svh] flex-col justify-center px-6 pb-20 pt-24">
      {/*
        Faint, and sitting on the bowl of the arc rather than in the middle of
        the section.

        At full strength and centred it was a green stain across the whole
        band — a `--haze` layer 62vmax across on a section 900px tall is a
        background colour, not a glow. The ground has to stay near-black for any of it to
        read as bright.

        It also carries the far, formless end of the arc's own falloff. That
        used to be a third Gaussian blur at `stdDeviation="46"`, which
        re-blurred several megapixels on every frame of the entrance and made
        the page stutter on load. At that distance from the source a gradient
        has no edge to give it away, and it costs nothing to animate.
      */}
      <div
        className="bloom opacity-40"
        style={
          { '--bloom-x': '50%', '--bloom-y': '62%' } as React.CSSProperties
        }
      />
      <DarkNavZone />

      <div className="mx-auto w-full max-w-6xl">
        {/*
          The wordmark and the tagline are one `<h1>`. The wordmark's
          `aria-label` says "Softmato" and the span says what the company does,
          so the heading's accessible name is the whole sentence — which is
          what it looks like on screen, and what a page with its name drawn as
          a light-form would otherwise lose entirely.
        */}
        <h1>
          {/*
            Arc, then name, then lens — which is also the stacking order, and
            the reason `HeroEye` comes last despite drawing partly *behind* the
            wordmark. It renders two layers straddling the letters: the
            coloured half sits at the arc's depth and the filament sits above
            the type. Painted before `HeroWordmark` its lower layer would still
            land correctly and its upper one would not.
          */}
          <span className="hero-mark">
            <HeroArc />
            <HeroWordmark />
            <HeroEye />
          </span>

          <StaggerIn delay={HERO.tagline} className="mt-6 text-center sm:mt-8">
            {/*
              `text-balance` and a bounded measure, because this line comes
              from the CMS and its length is not ours to choose. The
              reference's tagline is four words on one line; ours is nine, and
              left to wrap on its own it broke into three ragged lines with one
              orphan. Balanced across two, it reads as a deliberate stack.
            */}
            <span className="mx-auto block max-w-[46ch] text-balance text-[clamp(0.8rem,1.35vw,0.98rem)] font-medium uppercase tracking-[0.22em] text-foreground/70">
              {tagline}
            </span>
          </StaggerIn>
        </h1>

        <StaggerIn delay={HERO.copy} className="text-center">
          <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="pill-cta pill-solid">
              Start a project
            </Link>
            <Link href="/products" className="pill-cta pill-quiet">
              See what we run
            </Link>
          </div>

          {lede ? (
            <p className="mx-auto mt-7 max-w-[50ch] text-[14px] leading-relaxed text-muted-foreground">
              {lede}
            </p>
          ) : null}
        </StaggerIn>
      </div>
    </section>
  );
}

import Link from 'next/link';

import { BlurIn } from '@/components/motion/blur-in';
import { StaggerIn } from '@/components/motion/stagger-in';

/**
 * The closing panel — the reference's last frame: a question set large, one
 * pill under it, and nothing else on the screen.
 *
 * A question rather than a statement, and a question the reader can answer
 * with "yes" or "no" rather than one that assumes the answer. The reference
 * does the same thing, and it is the difference between an invitation and a
 * sales line.
 *
 * The arc from the hero returns here, upside down, closing the page on the
 * shape it opened with. It is drawn straight rather than animated: this is a
 * reprise, and a second full performance of the hero's entrance at the foot of
 * the page competes with the button it is supposed to be framing.
 */
export function ClosingCta() {
  return (
    <section className="stage px-6 pb-40 pt-28 sm:pb-56 sm:pt-40">
      <div
        className="bloom"
        style={{ '--bloom-x': '50%', '--bloom-y': '78%' } as React.CSSProperties}
      />

      <div className="mx-auto w-full max-w-4xl text-center">
        <BlurIn
          as="h2"
          className="headline mx-auto max-w-[20ch] text-[clamp(2rem,5.5vw,4rem)] leading-[1.06]"
        >
          Have something that needs building properly?
        </BlurIn>

        <StaggerIn onScroll delay={0.2} className="mt-12">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className="pill-cta pill-solid">
              Tell us about it
            </Link>
            <Link href="/services" className="pill-cta pill-quiet">
              What we take on
            </Link>
          </div>

          <p className="mt-7 text-[14px] text-muted-foreground">
            We read every message ourselves. No form goes to an inbox nobody
            opens.
          </p>
        </StaggerIn>

        {/*
          The reprise. Inverted — the hero's bowl becomes a dome — so the page
          reads as closing rather than starting again.
        */}
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

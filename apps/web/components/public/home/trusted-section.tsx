import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { TRUSTED_HEADING } from '@/lib/home/sentences';

import { TrustedWall } from './trusted-wall';

/**
 * The close: the names that run on our work, hung on a wall, and one action.
 *
 * Light, and floating free on the page, where the old close was a dark band
 * with a WebGL carousel in it — the founder found that one lagged, and asked
 * for their testimonial-wall reference instead, without its card. The tiles
 * without a name are the invitation: the copy says so, and the button is the
 * same "Tell us about it" the hero opens on.
 */
export function TrustedSection() {
  return (
    <section className="stage px-4 pb-24 pt-10 sm:px-6 sm:pb-32 sm:pt-16">
      <div className="relative mx-auto w-full max-w-7xl">
        <TrustedWall />

        <StaggerIn
          onScroll
          className="relative z-10 mx-auto mt-10 max-w-2xl text-center sm:mt-14"
        >
          <p className="inline-flex rounded-full bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-foreground ring-1 ring-border">
            In production
          </p>

          <ToneReveal
            sentence={TRUSTED_HEADING}
            className="headline mx-auto mt-6 max-w-[22ch] text-balance text-[clamp(1.9rem,4.4vw,3.5rem)] leading-[1.06]"
          />

          <p className="mx-auto mt-6 max-w-[40ch] text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed text-foreground/80">
            Every tile with a name on it is live, and we still look after it.
            The rest are waiting for yours.
          </p>

          <div className="mt-9">
            <Link
              href="/contact"
              className="pill-cta bg-[color:var(--ink)] text-white shadow-[0_14px_30px_-14px_rgba(4,18,13,0.6)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Tell us about it
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-4"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </StaggerIn>
      </div>
    </section>
  );
}

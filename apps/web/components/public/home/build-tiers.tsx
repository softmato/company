import Link from 'next/link';

import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkArrow } from '@/components/public/marks';
import { TIERS_HEADING } from '@/lib/home/sentences';
import { TIERS } from '@/lib/home/tiers';

import { TierRow } from './tier-row';

/**
 * The scope ladder — static, advanced, custom — for websites and for apps.
 *
 * **This is the section that stands in for a price list.** No figure appears on
 * this site: a price on a public page is an offer, and scope decides the price.
 * What a visitor actually wants from a pricing table is to know roughly what
 * band they are in before they write to anyone, and three rungs with a yes/no
 * test each answers that without committing anybody to a number. See
 * `lib/home/tiers.ts` for the tests themselves and why the axis is what the
 * software has to answer to rather than how big it is.
 *
 * The shape is a ruled ladder, deliberately the plainest section on the page:
 * it sits between the dark products band and the physics pile, and three
 * sections in a row that all want to be looked at leaves nothing to look at.
 * This one wants to be *read*. It is also the only section here that could be
 * printed and still work, which is about right for the part that describes what
 * a job costs to build.
 *
 * Placeholder copy pending the founder's confirmation of the three definitions.
 */
export function BuildTiers() {
  return (
    <section className="stage px-6 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl">
        {/* A grid, not a flex row: see the note on the same pattern in
            `services-chapter.tsx`. */}
        <div className="grid items-end gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">How a build is scoped</p>
            <ToneReveal
              sentence={TIERS_HEADING}
              className="headline mt-6 max-w-[16ch] text-[clamp(1.9rem,4.6vw,3.25rem)] leading-[1.08]"
            />
          </div>

          <p className="max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
            Take the first question you can answer yes to — that is the rung.
            The same ladder applies to a website and to an app, which is why the
            two columns line up. We do not publish prices; scope decides them,
            and scope is a conversation.
          </p>
        </div>

        <StaggerIn onScroll className="mt-16 border-b border-border">
          {TIERS.map((tier, index) => (
            <TierRow key={tier.id} tier={tier} index={index} />
          ))}
        </StaggerIn>

        <Link
          href="/contact"
          className="link-arrow mt-12 text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>Not sure which one? Tell us what it has to do</span>
          <MarkArrow className="size-5" />
        </Link>
      </div>
    </section>
  );
}

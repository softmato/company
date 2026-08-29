'use client';

import { useEffect, useRef, useState } from 'react';

import { DrawIn } from '@/components/motion/draw-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkSpark } from '@/components/public/marks';
import { SERVICES_HEADING } from '@/lib/home/sentences';

import { DisciplineCluster } from './discipline-cluster';
import { ServiceStep } from './service-step';
import { stillFor } from './stills';

/**
 * The services chapter: one panel held still on the left while the services
 * scroll past it on the right.
 *
 * **This is the page's one demonstration.** Every other section describes
 * something; this one shows a picture of the kind of screen each piece of work
 * produces and changes the picture as the reader moves. It replaces a grid of
 * three cards, which said the same thing in a shape this site cannot afford to
 * use — the page is the portfolio for a company that sells websites, and a card
 * grid is the one layout every template already has.
 *
 * The panel is `position: sticky`, not a pinned ScrollTrigger. See
 * `components/motion/sticky-steps.tsx` for why, and for why the active step is
 * decided by an observer band across the middle of the viewport.
 *
 * A client component because the active step is client state. The service rows
 * are queried by `services-section.tsx` and passed in — a `'use client'` file
 * cannot be `async`, and pushing the query up is cheaper than a `use()` and a
 * suspense boundary for three rows that are already on the server.
 */
export interface ServiceStepData {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
}

export function ServicesChapter({ services }: { services: ServiceStepData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = ref.current;

    if (!root) return;

    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const index = Number((entry.target as HTMLElement).dataset.step ?? 0);
          if (Number.isInteger(index)) setActive(index);
        }
      },
      /*
       * A band across the middle of the viewport — the height the sticky panel
       * occupies. Observing entry at the bottom edge instead switches the panel
       * a screen early, while the previous step is still the one being read.
       */
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    steps.forEach((step) => observer.observe(step));

    return () => observer.disconnect();
  }, [services.length]);

  return (
    <section className="stage px-6 pb-24 pt-16 sm:pb-32 sm:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        {/*
          `min-w-0 flex-1` on the heading block, not just a max-width. A flex
          item defaults to `min-width: auto`, so a heading beside anything else
          shrinks to its longest *word* and comes out as a column of one-word
          lines — which is exactly what this did before the `flex-1`.
        */}
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">What we take on</p>
            <ToneReveal
              sentence={SERVICES_HEADING}
              className="headline mt-6 max-w-[20ch] text-[clamp(1.9rem,4.6vw,3.25rem)] leading-[1.08]"
            />
          </div>

          <DrawIn className="hidden shrink-0 text-primary/60 sm:block" delay={0.2}>
            <MarkSpark className="size-10" />
          </DrawIn>
        </div>

        {/*
          The short answer, before the long one. The steps below take a full
          screen each to say what one kind of work involves, which is the right
          depth for a reader who has already decided to stay — but it is four
          screens before the page has named all four disciplines. This names
          them in one, and gives the section the parallax it otherwise has none
          of: the sticky panel deliberately does not move, so without this the
          whole chapter is static while the copy scrolls past it.
        */}
        <DisciplineCluster />

        <div
          ref={ref}
          className="mt-24 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20"
        >
          {/*
            `self-start` is what gives the sticky child something to stick
            inside: a grid item stretched to the full row height has no room to
            move within, which is the usual reason a sticky panel does nothing.
          */}
          <div className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <div className="relative">
              {services.map((service, index) => {
                const Still = stillFor(service.slug);

                return (
                  <div
                    key={service.id}
                    className={`transition-opacity duration-500 ease-out ${
                      index === 0 ? 'relative' : 'absolute inset-0'
                    } ${index === active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  >
                    <Still />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            {services.map((service, index) => {
              const Still = stillFor(service.slug);

              return (
                <ServiceStep
                  key={service.id}
                  index={index}
                  active={index === active}
                  title={service.title}
                  summary={service.summary}
                  href={`/services/${service.slug}`}
                >
                  {/*
                    On a phone there is no room to hold a panel beside anything,
                    so each step carries its own still underneath it. Dropping
                    them below `lg` would take the demonstration away from
                    exactly the readers most likely to be on the site — this is
                    Nepal, and the traffic is phones.
                  */}
                  <Still />
                </ServiceStep>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

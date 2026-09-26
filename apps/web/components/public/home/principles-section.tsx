import { ToneReveal } from '@/components/motion/tone-reveal';
import { PRINCIPLES_HEADING } from '@/lib/home/sentences';
import { listPublishedServices } from '@/lib/cms/public-queries';

import { BelieveFlow } from './believe-flow';
import { ServiceCards } from './service-cards';

/**
 * What we believe, drawn as a route: what a client sees on one side, what has
 * to be right underneath on the other, Softmato in between.
 *
 * **The diagram replaces the pile.** The word heap was the second reference
 * film's physics drop; the founder swapped it for the third film's shape — a
 * blueprint that draws itself, cards that attach to the ends of its lines,
 * and a current running along the wires once it is built. See
 * `BelieveFlow` for the frame and `use-believe-motion.ts` for the order.
 *
 * Under it, the published services as plain cards with a beam round each
 * border — the founder's reference is a Framer agency's services grid. They
 * replaced the three principle cards, whose copy lives on the About page.
 * No services published, no grid: the diagram stands on its own.
 *
 * One word of the heading is underlined — "right," — through the sentence's
 * own `mark`, so the stroke is drawn on the word's line box and follows it
 * wherever the heading wraps. It used to be an overlay placed by percentage,
 * which landed on "software that" at desktop widths and read as a strike.
 * The film scribbles over two or three words per headline, but its marks are
 * its brand where ours are punctuation, so there is one on this page and one
 * on the close.
 */
export async function PrinciplesSection() {
  const services = await listPublishedServices();

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
        <div className="relative z-10 mx-auto max-w-[40rem] text-center">
          <p className="eyebrow">What we believe</p>

          <ToneReveal
            sentence={PRINCIPLES_HEADING}
            className="headline mx-auto mt-6 max-w-[16ch] text-[clamp(2rem,5.2vw,3.75rem)] leading-[1.06]"
          />
        </div>

        <div className="mt-14">
          <BelieveFlow />
        </div>

        {services.length > 0 && (
          <div className="mt-16">
            <p className="mx-auto w-fit rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-medium">
              Services
            </p>
            <div className="mt-6">
              <ServiceCards
                services={services.map(({ slug, title, summary }) => ({ slug, title, summary }))}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

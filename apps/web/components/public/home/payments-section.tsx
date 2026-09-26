import { ToneReveal } from '@/components/motion/tone-reveal';
import { BentoCard, BentoGrid } from '@/components/public/bento/bento-grid';
import { Globe } from '@/components/three/globe';
import { BENTO_COPY, GLOBE_MARKERS, INTEGRATIONS_HEADING } from '@/lib/home/payments-bento';

import { IntegrationOrbit } from './integration-orbit';
import { PaymentActivity } from './payment-activity';
import { PaymentCardsArt } from './payment-cards-art';
import { PaymentFlow } from './payment-flow';

/**
 * Payments and integrations, as a bento: the one chapter on the page shaped as
 * a grid of unequal tiles (see `page.tsx` — each shape is used once).
 *
 * After the founder's fintech reference: a wide banner across the top with an
 * object floating in it, then tiles of different sizes, each a small live
 * picture of one thing we do with its caption underneath. Every tile moves on
 * its own terms — cards bob, the beam sweeps, the feed ticks, the icons orbit,
 * the globe turns — and every one of them stops when it is off screen.
 *
 * Below `lg` the grid is one column and every tile is full width.
 */
export function PaymentsSection() {
  return (
    <section className="stage px-6 pb-24 pt-20 sm:pb-32 sm:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-[40rem] text-center">
          <p className="eyebrow">Payments &amp; integrations</p>
          <ToneReveal
            sentence={INTEGRATIONS_HEADING}
            className="headline mx-auto mt-6 max-w-[16ch] text-[clamp(2rem,5.2vw,3.75rem)] leading-[1.06]"
          />
        </div>

        <BentoGrid className="mt-14 lg:grid-rows-[19rem]">
          <BentoCard
            {...BENTO_COPY.wallets}
            className="lg:col-span-3 lg:justify-center"
            background={
              <PaymentCardsArt className="absolute inset-x-0 top-0 h-3/5 lg:inset-y-0 lg:left-auto lg:h-full lg:w-[55%]" />
            }
          />
          <BentoCard
            {...BENTO_COPY.flow}
            className="lg:col-span-2"
            background={
              <div className="absolute inset-x-6 top-6 [mask-image:linear-gradient(to_bottom,#000_88%,transparent)]">
                <PaymentFlow />
              </div>
            }
          />
          <BentoCard
            {...BENTO_COPY.activity}
            className="lg:col-span-1 lg:row-span-2"
            background={<PaymentActivity />}
          />
          <BentoCard
            {...BENTO_COPY.integrations}
            className="lg:col-span-1"
            background={<IntegrationOrbit />}
          />
          <BentoCard
            {...BENTO_COPY.hosting}
            className="lg:col-span-1"
            background={
              <div className="absolute inset-x-0 top-0 h-[70%] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]">
                <Globe
                  markers={GLOBE_MARKERS}
                  className="absolute left-1/2 top-4 w-[118%] max-w-[26rem] -translate-x-1/2"
                />
              </div>
            }
          />
        </BentoGrid>
      </div>
    </section>
  );
}

import { WordReveal } from '@/components/motion/word-reveal';
import { LightForm } from '@/components/three/light-form';

/**
 * The globe section — the reference's "Many locations" frame.
 *
 * The reference rings its globe with figures: 50 locations, 40 of something
 * else. **We have no figures like that and will not invent them**, so the
 * label carries the one number on this page that is checkable — the city's
 * actual coordinates — and the section says where the company is instead of
 * how much of it there is.
 *
 * That is not a compromise on the design. The reference's numbers are doing a
 * typographic job as much as an informational one: a mono figure with a
 * hairline running off it, set against a slowly turning globe. A real
 * coordinate does that job and is true.
 */
export function PlaceSection() {
  return (
    <section className="stage px-6 py-28 sm:py-36">
      <div
        className="bloom"
        style={{ '--bloom-x': '58%', '--bloom-y': '52%' } as React.CSSProperties}
      />
      <LightForm kind="globe" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-12 py-[14vh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="eyebrow">Where we are</p>

            <WordReveal
              as="h2"
              className="headline mt-7 max-w-[12ch] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.03]"
            >
              Built in Kathmandu.
            </WordReveal>

            <p className="mt-7 max-w-[46ch] text-[16px] leading-relaxed text-muted-foreground">
              Softmato Technology Pvt Ltd is registered in Nepal and works from
              Kathmandu. Bikram Sambat dates, eSewa and Khalti, a Sunday-to-Friday
              week — none of that is an edge case here.
            </p>

            {/*
              The hairline and the coordinate are the reference's stat treatment,
              carrying the one figure on this page that can be checked against
              something. Mono and tabular like every other number in the product.
            */}
            <div className="mt-12 flex items-center gap-4">
              <p className="numeric text-[13px] leading-relaxed text-muted-foreground">
                27.7172° N
                <br />
                85.3240° E
              </p>
              <hr className="rule w-24 shrink-0" />
              <p className="text-[13px] text-muted-foreground">Kathmandu, Nepal</p>
            </div>
          </div>

          {/*
            An empty column. The globe is painted behind the whole section by
            `LightForm`, and this is the space reserved for it — giving it a
            container would mean sizing a WebGL canvas to a div and then
            fighting the two whenever the layout changes.
          */}
          <div aria-hidden="true" className="min-h-[44vh]" />
        </div>
      </div>
    </section>
  );
}

import { DrawIn } from '@/components/motion/draw-in';
import { Parallax } from '@/components/motion/parallax';
import { CmsImage } from '@/components/public/cms-image';
import { MarkSquiggle } from '@/components/public/marks';
import { LightForm } from '@/components/three/light-form';
import { PLACE_COORDINATES, PLACE_PHOTO } from '@/lib/home/place';

/**
 * Where the company is: a photograph of the city, the globe behind it, and the
 * one figure on this page that can be checked against something.
 *
 * The first reference film rings its globe with figures — 50 locations, 40 of
 * something else. **We have no figures like that and will not invent them**, so
 * the label carries the city's actual coordinates and the section says where
 * the company is rather than how much of it there is. That is not a compromise:
 * the film's numbers are doing a typographic job as much as an informational
 * one — a mono figure with a hairline running off it — and a real coordinate
 * does that job and is true.
 *
 * **The photograph is new and it is a placeholder.** The second film leans on
 * real photography throughout, and this page had none; a page about a company
 * in Kathmandu with no picture of anywhere is colder than it needs to be. It is
 * a picture of the city rather than of an office, because a stock photograph of
 * an office reads as a picture of this office, and that is a claim. See
 * `lib/home/place.ts`.
 *
 * It is tilted, and it drifts against the scroll. Both are the film's treatment
 * of a photograph — it never sets one square to the grid — and both cost one
 * property each.
 */
export function PlaceSection() {
  return (
    <section className="stage px-6 py-24 sm:py-32">
      <div
        className="bloom opacity-45"
        style={
          { '--bloom-x': '30%', '--bloom-y': '58%' } as React.CSSProperties
        }
      />
      <LightForm kind="globe" />

      <div className="mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div>
            <p className="eyebrow">Where we are</p>

            <h2 className="headline mt-6 max-w-[12ch] text-[clamp(2.25rem,6vw,4rem)] leading-[1.03]">
              Built in Kathmandu.
            </h2>

            <p className="mt-7 max-w-[46ch] text-[16px] leading-relaxed text-muted-foreground">
              Softmato Technology Pvt Ltd is registered in Nepal and works from
              Kathmandu. Bikram Sambat dates, eSewa and Khalti, a
              Sunday-to-Friday week — none of that is an edge case here.
            </p>

            {/*
              The hairline and the coordinate are the first film's stat
              treatment, carrying the one figure on this page that can be
              checked against something. Mono and tabular like every other
              number in the product.
            */}
            <div className="mt-12 flex items-center gap-4">
              <p className="numeric text-[13px] leading-relaxed text-muted-foreground">
                {PLACE_COORDINATES.latitude}
                <br />
                {PLACE_COORDINATES.longitude}
              </p>
              <hr className="rule w-24 shrink-0" />
              <p className="text-[13px] text-muted-foreground">
                {PLACE_COORDINATES.label}
              </p>
            </div>
          </div>

          <div className="relative">
            <DrawIn className="pointer-events-none absolute -left-16 -top-10 hidden text-primary/25 lg:block">
              <MarkSquiggle />
            </DrawIn>

            <Parallax speed={0.06}>
              <figure className="rotate-[2.5deg]">
                <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-float">
                  <CmsImage
                    src={PLACE_PHOTO.src}
                    alt={PLACE_PHOTO.alt}
                    width={PLACE_PHOTO.width}
                    height={PLACE_PHOTO.height}
                    sizes="(min-width: 1024px) 34vw, 88vw"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {PLACE_PHOTO.credit}
                </figcaption>
              </figure>
            </Parallax>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';

import { Parallax } from '@/components/motion/parallax';
import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { MarkArrow } from '@/components/public/marks';
import { listPublishedProducts } from '@/lib/cms/public-queries';
import { PRODUCTS_HEADING } from '@/lib/home/sentences';

import { DarkNavZone } from './dark-nav-zone';
import { DeviceScreen } from './device-screen';

/**
 * The products chapter: the page's first dark band, and the only place on the
 * site that shows real product surfaces.
 *
 * **Why the band has a radius now.** The second reference film never butts a
 * dark section against a light one on a straight edge — the dark panel has a
 * large top radius and slides up over the section above, which is what lets it
 * use two dark chapters on one page without the page reading as stripes. The
 * earlier build allowed exactly one dark section for that reason and drew it
 * with a hard edge; the radius is what removes the reason. See `.band-dark`.
 *
 * **Why the products alternate sides.** They used to sit in a two-column grid,
 * which put both device frames at the same height and made the pair read as one
 * wide screenshot. Alternating gives each product a full row, a headline-sized
 * name and a real measure of copy — the reference's asymmetric split, once per
 * product — and it means a company with one product does not have a hole beside
 * it.
 *
 * `DarkNavZone` is rendered here as well as in the hero: the header is `fixed`
 * and cannot inherit from a section it merely overlaps, so every dark band has
 * to tell it. That is exactly the coupling the attribute mechanism exists to
 * make cheap.
 *
 * Products are published CMS rows, so this returns null when there are none.
 */
export async function ProductsSection() {
  const products = await listPublishedProducts();

  if (products.length === 0) return null;

  return (
    <section className="stage band-dark dark px-6 py-28 sm:py-40">
      {/*
        Pushed off the bottom so it reads as light coming up from under the
        devices rather than as a lamp behind the heading.
      */}
      <div
        className="bloom opacity-45"
        style={{ '--bloom-x': '50%', '--bloom-y': '98%' } as React.CSSProperties}
      />
      <DarkNavZone />

      <div className="mx-auto w-full max-w-6xl">
        {/*
          70% white and up, not the 45–55% these started at. The bloom below
          lifts the ink ground toward #2d4c40, and against that a 45% white
          eyebrow is 3.3:1 — under the line for 10.5px text. Check dark-section
          text against the *lit* ground, never against `--ink` itself.
        */}
        <p className="eyebrow text-white/70">Our own products</p>

        <ToneReveal
          sentence={PRODUCTS_HEADING}
          tone="dark"
          className="display mt-7 max-w-[14ch] text-[clamp(2.5rem,7vw,5rem)] text-white"
        />

        <p className="mt-8 max-w-[52ch] text-[16px] leading-relaxed text-white/75">
          We designed them, we host them, and we answer the phone when something
          breaks. Running our own software is what keeps us honest about how we
          build yours.
        </p>

        <div className="mt-24 space-y-28 sm:space-y-40">
          {products.map((product, index) => (
            <article
              key={product.id}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              {/*
                Alternating. The device takes the right of the first row and the
                left of the second, and `lg:order-*` does it rather than two
                different JSX branches — the markup order stays the reading
                order, which is what a screen reader and a phone both get.
              */}
              <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
                {/*
                  The frames drift at different rates as the section passes.
                  That difference is the whole depth cue — matching the speeds
                  would move them as one flat sheet.
                */}
                <Parallax speed={index % 2 === 0 ? 0.1 : 0.05}>
                  <DeviceScreen
                    title={product.title}
                    screenshotUrl={product.screenshotUrl}
                  />
                </Parallax>
              </div>

              <StaggerIn onScroll>
                <p className="numeric text-[11px] tracking-[0.2em] text-white/50">
                  {String(index + 1).padStart(2, '0')}
                </p>

                <h3 className="headline mt-5 text-[clamp(1.8rem,4vw,2.75rem)] text-white">
                  {product.title}
                </h3>

                {product.tagline ? (
                  <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-white/70">
                    {product.tagline}
                  </p>
                ) : null}

                <Link
                  href={`/products/${product.slug}`}
                  className="link-arrow mt-10 text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
                >
                  <span>About {product.title}</span>
                  <MarkArrow className="size-5" />
                </Link>
              </StaggerIn>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

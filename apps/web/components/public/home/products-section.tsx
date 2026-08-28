import Link from 'next/link';

import { Parallax } from '@/components/motion/parallax';
import { StaggerIn } from '@/components/motion/stagger-in';
import { WordReveal } from '@/components/motion/word-reveal';
import { listPublishedProducts } from '@/lib/cms/public-queries';

import { DeviceScreen } from './device-screen';

/**
 * The products section, and the page's one dark beat.
 *
 * The reference is dark from end to end and gets its depth from the light in
 * it. Ours is light from end to end, which needs the opposite: one inversion,
 * placed where the page most needs a floor under it. Two of them would read as
 * stripes and undo the effect — this is the only `.stage-dark` on the site.
 *
 * Products are published CMS rows, so this returns null when there are none.
 */
export async function ProductsSection() {
  const products = await listPublishedProducts();

  if (products.length === 0) return null;

  return (
    <section className="stage stage-dark px-6 py-28 sm:py-40">
      {/*
        The bloom on a dark ground is the same three gradients doing the
        opposite job: on white they tint, here they are the only light in the
        section. Pushed off the bottom so it reads as light coming up from
        under the devices.
      */}
      <div
        className="bloom opacity-40"
        style={{ '--bloom-x': '50%', '--bloom-y': '96%' } as React.CSSProperties}
      />

      <div className="mx-auto w-full max-w-6xl">
        {/*
          70% white and up, not the 45–55% these started at. The bloom below
          lifts the ink ground toward #2d4c40, and against that a 45% white
          eyebrow is 3.3:1 — under the line for 10.5px text. Check dark-section
          text against the *lit* ground, never against `--ink` itself.
        */}
        <p className="eyebrow text-white/70">Our own products</p>

        <WordReveal
          as="h2"
          tone="dark"
          className="headline mt-7 max-w-[16ch] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.03]"
        >
          We run what we build.
        </WordReveal>

        <p className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-white/75">
          We designed them, we host them, and we answer the phone when something
          breaks. Running our own software is what keeps us honest about how we
          build yours.
        </p>

        <StaggerIn onScroll className="mt-16 grid gap-10 lg:grid-cols-2">
          {products.map((product, index) => (
            <article key={product.id}>
              {/*
                The two frames drift at different rates as the section passes.
                That difference is the whole depth cue — matching the speeds
                would move them as one flat sheet — so the second is given a
                slower drift rather than the same one.
              */}
              <Parallax speed={index === 0 ? 0.1 : 0.045}>
                <DeviceScreen
                  title={product.title}
                  screenshotUrl={product.screenshotUrl}
                />
              </Parallax>

              <div className="mt-7 flex flex-wrap items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="headline text-[22px] text-white">
                    {product.title}
                  </h3>
                  {product.tagline ? (
                    <p className="mt-2 max-w-[42ch] text-[14.5px] leading-relaxed text-white/70">
                      {product.tagline}
                    </p>
                  ) : null}
                </div>

                <Link
                  href={`/products/${product.slug}`}
                  className="shrink-0 rounded-full border border-white/20 px-5 py-2.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
                >
                  About {product.title}
                </Link>
              </div>
            </article>
          ))}
        </StaggerIn>
      </div>
    </section>
  );
}

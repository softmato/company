import { Drift } from '@/components/motion/drift';
import { Parallax } from '@/components/motion/parallax';
import { DIRECT_LINE, OWN_PRODUCTS } from '@/lib/home/how-we-work';

import { WorkAvatar } from './work-avatar';
import { WorkShippedCard } from './work-shipped-card';
import { WorkPortalCard } from './work-portal-card';

/**
 * The composition under the headline: cards stacked on a curved horizon, as in
 * the reference. It is the story's third beat — the checkout from the request
 * card, finished and live — with the client portal beside it, where that and
 * every other project the client has with us is followed stage by stage, and
 * a small card saying the same change lands on the website and the app.
 *
 * Where the reference puts client logos bottom-left, this puts our own
 * products (the CMS says HostelPalika and QuestionCall are ours, built and run
 * by us). Where it puts a review score bottom-right, it puts the two people.
 * Client logos and ratings are claims about customers; these are not.
 *
 * On `lg` the cards overlap at fixed positions, each on its own parallax speed
 * so the stack separates as the reader scrolls past. Below that they stack in
 * a centred column and the horizon is dropped — there is no width to curve.
 */
export function WorkShowcase() {
  return (
    <div className="relative mt-16 flex flex-col items-center gap-6 lg:mt-20 lg:block lg:h-[32rem]">
      <div aria-hidden="true" className="work-horizon hidden lg:block" />

      <div aria-hidden="true" className="relative z-20 lg:absolute lg:left-[24%] lg:top-0">
        <Parallax speed={0.06}>
          <WorkShippedCard />
          <span className="bell-bubble absolute -right-4 -top-4">
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="bell-ring size-5"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </span>
        </Parallax>
      </div>

      {/* Web and app: the same change, both places. Icons carry it. */}
      <div aria-hidden="true" className="relative z-10 hidden lg:absolute lg:left-[58%] lg:top-[2%] lg:block">
        <Drift distance={8} duration={5.4}>
          <div className="float-card flex gap-2 p-2.5">
            {[
              { label: 'Website', d: 'M3 5h18v14H3zM3 9h18M6 7h.01M8.5 7h.01' },
              { label: 'App', d: 'M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM11 18.5h2' },
            ].map((platform) => (
              <span
                key={platform.label}
                className="flex items-center gap-2 rounded-xl bg-surface py-2 pl-2.5 pr-3 text-[12.5px] font-medium text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4 text-primary">
                  <path d={platform.d} />
                </svg>
                {platform.label}
              </span>
            ))}
          </div>
        </Drift>
      </div>

      <div className="relative z-10 lg:absolute lg:left-[54%] lg:top-[17%]">
        <Parallax speed={0.12}>
          <WorkPortalCard />
        </Parallax>
      </div>

      <div className="relative z-10 mt-4 text-center lg:absolute lg:bottom-[6%] lg:left-0 lg:mt-0 lg:text-left">
        <p className="text-[12.5px] text-muted-foreground">Products we build and run</p>
        <ul className="mt-2.5 flex items-center justify-center gap-6 lg:justify-start">
          {OWN_PRODUCTS.map((product) => (
            <li key={product.name} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.src}
                alt=""
                height={26}
                width={Math.round(26 * product.ratio)}
                className="h-[26px] w-auto"
              />
              <span className="text-[15px] font-semibold text-foreground">{product.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 flex items-center gap-3 lg:absolute lg:bottom-[6%] lg:right-0">
        <span className="flex -space-x-2.5">
          <WorkAvatar who="client" className="size-10" />
          <WorkAvatar who="engineer" className="size-10" />
        </span>
        <span>
          <span className="block text-[13.5px] font-medium text-foreground">{DIRECT_LINE.title}</span>
          <span className="block text-[12px] text-muted-foreground">{DIRECT_LINE.body}</span>
        </span>
      </div>
    </div>
  );
}

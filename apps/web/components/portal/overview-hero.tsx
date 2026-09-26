import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import { SCENES } from '@/lib/portal/art';

/**
 * The welcome banner: who they are, one sentence on what needs them, and the
 * shortest path to it. Deep brand green with a glow, and the product-building
 * scene from the marketing site.
 */
export function OverviewHero({
  clientName,
  greeting,
  summary,
  action,
}: {
  clientName: string;
  greeting: string;
  summary: string;
  action?: { label: string; href: string } | undefined;
}) {
  const scene = SCENES.product;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#053d2e_0%,#047857_48%,#0f9f8a_100%)] px-6 py-8 text-white shadow-float sm:px-10 sm:py-10">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-28 -z-10 size-96 rounded-full bg-emerald-300/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 left-1/4 -z-10 size-80 rounded-full bg-teal-200/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_right,black,transparent_70%)]"
      />

      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25 backdrop-blur">
            <Sparkles
              className="size-3.5 text-emerald-200"
              aria-hidden="true"
            />
            {clientName}
          </p>
          <h1 className="display mt-4 text-[34px] sm:text-[46px]">
            {greeting}
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-emerald-50/90">
            {summary}
          </p>
          {action ? (
            <Link
              href={action.href}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-950/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              {action.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <Image
          src={scene.src}
          alt=""
          width={scene.width}
          height={scene.height}
          priority
          sizes="(min-width: 1024px) 380px, 300px"
          className="hidden w-[300px] drop-shadow-2xl md:block lg:w-[380px]"
        />
      </div>
    </section>
  );
}

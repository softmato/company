import Link from 'next/link';
import { ArrowRight, ChevronRight, Layers } from 'lucide-react';

import { BlurIn } from '@/components/motion/blur-in';

import { ProcessCard } from './process-card';
import { ServiceArt } from './service-art';

/**
 * The top of a service page: a visible breadcrumb, the service's icon, name
 * and summary with the two next steps, and how a project runs beside it.
 */
export function ServiceHero({
  slug,
  title,
  summary,
}: {
  slug: string;
  title: string;
  summary: string | null;
}) {
  return (
    <header>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <li>
            <Link href="/services" className="hover:text-foreground">
              Services
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div>
          <ServiceArt slug={slug} className="size-16 text-foreground" />

          <BlurIn
            as="h1"
            className="headline mt-6 max-w-[16ch] text-[clamp(2.4rem,6vw,3.6rem)] leading-[1.05]"
          >
            {title}
          </BlurIn>

          {summary ? (
            <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Start a project
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/plans"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-5 text-[14px] font-medium ring-1 ring-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Layers className="size-4" aria-hidden="true" />
              See plans
            </Link>
          </div>
        </div>

        <ProcessCard />
      </div>
    </header>
  );
}

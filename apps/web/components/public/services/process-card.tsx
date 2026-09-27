import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PROCESS_STEPS } from '@/lib/process/steps';

/** The steps worth seeing before a first message; the rest are on the page. */
const SHOWN = new Set(['talk', 'access', 'build', 'launch']);

/**
 * "How it runs" beside a service's title: four step names from the founder's
 * own process page, linked to it for the detail.
 */
export function ProcessCard() {
  const steps = PROCESS_STEPS.filter((step) => SHOWN.has(step.key));

  return (
    <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <p className="text-[13px] font-medium text-muted-foreground">
        How it runs
      </p>

      <ol className="mt-5 space-y-0">
        {steps.map((step, index) => (
          <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-border"
              />
            ) : null}
            <span className="numeric grid size-7 flex-none place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
              {index + 1}
            </span>
            <span className="pt-1 text-[14.5px] font-medium">{step.title}</span>
          </li>
        ))}
      </ol>

      <Link
        href="/how-we-work"
        className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        The whole process
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}

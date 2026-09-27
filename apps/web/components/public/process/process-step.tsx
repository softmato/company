import { Check, Minus } from 'lucide-react';

import Link from 'next/link';

import { MarkArrow } from '@/components/public/marks';
import { Frame } from '@/components/public/services/service-art';
import { cn } from '@/lib/cn';
import type { ProcessStep } from '@/lib/process/steps';

import { STEP_MARKS } from './process-art';

/** Which plans include the step: a tick or a dash each, never a price. */
function Plans({ plans }: { plans: NonNullable<ProcessStep['plans']> }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {plans.map((p) => (
        <li
          key={p.name}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-inset',
            p.included
              ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
              : 'bg-muted text-muted-foreground ring-border',
          )}
        >
          {p.included ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Minus className="size-3.5" aria-hidden="true" />
          )}
          {p.name}
          <span className="sr-only">
            {p.included ? ': included' : ': not included'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One step: its number and mark on the left, what happens on the right. */
export function ProcessStepRow({
  step,
  index,
}: {
  step: ProcessStep;
  index: number;
}) {
  return (
    <li className="grid gap-5 border-t border-border py-10 first:border-t-0 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-8 lg:py-12">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start">
        <p className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </p>
        <Frame className="size-14 text-foreground">
          {STEP_MARKS[step.key]}
        </Frame>
      </div>

      <div className="max-w-[60ch]">
        <h2 className="headline text-xl">{step.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        {step.plans ? <Plans plans={step.plans} /> : null}
        {step.link ? (
          <Link
            href={step.link.href}
            className="link-arrow mt-5 text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span>{step.link.label}</span>
            <MarkArrow className="size-5" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

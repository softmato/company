import {
  Check,
  Code2,
  Globe,
  KeyRound,
  LifeBuoy,
  MessagesSquare,
  MonitorSmartphone,
  Rocket,
  Minus,
  type LucideIcon,
} from 'lucide-react';

import Link from 'next/link';

import { IconChip } from '@/components/portal/icon-chip';
import { MarkArrow } from '@/components/public/marks';
import type { Tone } from '@/components/portal/tone';
import { cn } from '@/lib/cn';
import type { ProcessStep } from '@/lib/process/steps';

const LOOK: Record<ProcessStep['key'], { icon: LucideIcon; tone: Tone }> = {
  talk: { icon: MessagesSquare, tone: 'sky' },
  access: { icon: KeyRound, tone: 'violet' },
  build: { icon: MonitorSmartphone, tone: 'emerald' },
  updates: { icon: Rocket, tone: 'amber' },
  launch: { icon: Globe, tone: 'emerald' },
  code: { icon: Code2, tone: 'sky' },
  care: { icon: LifeBuoy, tone: 'rose' },
};

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

/** One step: its number and icon on the left, what happens on the right. */
export function ProcessStepRow({
  step,
  index,
}: {
  step: ProcessStep;
  index: number;
}) {
  const look = LOOK[step.key];

  return (
    <li className="grid gap-5 border-t border-border py-10 first:border-t-0 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-8 lg:py-12">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start">
        <p className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </p>
        <IconChip icon={look.icon} tone={look.tone} size="lg" />
      </div>

      <div className="max-w-[60ch]">
        <h2 className="headline text-[clamp(1.5rem,3vw,2.1rem)] leading-tight">
          {step.title}
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
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

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { IconChip } from './icon-chip';
import { TONE, type Tone } from './tone';

/** One headline figure with its icon. `highlight` is for "this needs you". */
export function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  highlight,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 shadow-card',
        highlight ? TONE[tone].soft : 'border-border bg-card',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute -bottom-12 -right-10 size-32 rounded-full bg-gradient-to-br opacity-[0.14] blur-xl',
          TONE[tone].bar,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-[28px] font-medium leading-none tabular-nums">
            {value}
          </p>
        </div>
        <IconChip
          icon={icon}
          tone={tone}
          size="lg"
          solid={Boolean(highlight)}
        />
      </div>
      {note ? (
        <div className="relative mt-3 text-[13px] text-muted-foreground">
          {note}
        </div>
      ) : null}
    </div>
  );
}

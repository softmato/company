import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import { IconChip } from './icon-chip';
import type { Tone } from './tone';

/**
 * A titled panel with an icon, used for every section of a project page. The
 * icon and colour are what let a client find "files" or "messages" without
 * reading the headings.
 */
export function SectionCard({
  icon,
  tone,
  title,
  meta,
  id,
  className,
  bodyClassName,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  meta?: React.ReactNode;
  id?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        'scroll-mt-28 rounded-2xl border border-border bg-card shadow-card',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <div className="flex items-center gap-3">
          <IconChip icon={icon} tone={tone} size="sm" />
          <h2 className="headline text-[17px] leading-tight">{title}</h2>
        </div>
        {meta ? (
          <div className="text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </header>
      <div className={cn('px-5 pb-5 pt-3', bodyClassName)}>{children}</div>
    </section>
  );
}

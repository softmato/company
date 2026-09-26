import { cn } from '@/lib/cn';
import { PROJECT_LABEL, type ProjectStatus } from '@/lib/projects/labels';

const STYLE: Record<
  ProjectStatus,
  { pill: string; dot: string; pulse?: boolean }
> = {
  active: {
    pill: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25',
    dot: 'bg-emerald-500',
    pulse: true,
  },
  on_hold: {
    pill: 'bg-amber-500/12 text-amber-700 ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  completed: {
    pill: 'bg-sky-500/10 text-sky-700 ring-sky-500/25',
    dot: 'bg-sky-500',
  },
  cancelled: {
    pill: 'bg-muted text-muted-foreground ring-border',
    dot: 'bg-muted-foreground/60',
  },
};

/** A project's state as a coloured pill; a live project's dot breathes. */
export function StatusPill({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const style = STYLE[status];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        style.pill,
        className,
      )}
    >
      <span className="relative flex size-2">
        {style.pulse ? (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden',
              style.dot,
            )}
          />
        ) : null}
        <span
          className={cn('relative inline-flex size-2 rounded-full', style.dot)}
        />
      </span>
      {PROJECT_LABEL[status]}
    </span>
  );
}

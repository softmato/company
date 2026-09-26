import { Check } from 'lucide-react';

import { BsDate } from '@/components/ui/bs-date';
import { cn } from '@/lib/cn';
import { formatBs } from '@/lib/format/date';
import type { MilestoneView } from '@/lib/projects/bundle';
import { dayDate, relativeDue } from '@/lib/projects/dates';

/** A small tear-off calendar leaf: BS month over the day. */
function DateLeaf({
  date,
  tone,
}: {
  date: Date | null;
  tone: 'done' | 'late' | 'next' | 'none';
}) {
  const [day, month] = date ? formatBs(date).split(' ') : [];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid w-12 shrink-0 overflow-hidden rounded-xl border text-center shadow-sm',
        tone === 'done' && 'border-emerald-200 bg-emerald-50',
        tone === 'late' && 'border-rose-200 bg-rose-50',
        tone === 'next' && 'border-amber-200 bg-amber-50',
        tone === 'none' && 'border-border bg-muted',
      )}
    >
      <span
        className={cn(
          'py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white',
          tone === 'done' && 'bg-emerald-500',
          tone === 'late' && 'bg-rose-500',
          tone === 'next' && 'bg-amber-500',
          tone === 'none' && 'bg-muted-foreground/50',
        )}
      >
        {month ? month.slice(0, 3) : '—'}
      </span>
      <span className="py-1 font-mono text-base font-semibold leading-none tabular-nums">
        {tone === 'done' && !date ? (
          <Check className="mx-auto size-4" />
        ) : (
          (day ?? '?')
        )}
      </span>
    </span>
  );
}

/**
 * Dated checkpoints as calendar leaves. An overdue one says so in words as
 * well as colour. `action` renders beside each row — the admin's controls.
 */
export function MilestoneList({
  milestones,
  action,
}: {
  milestones: MilestoneView[];
  action?: (milestone: MilestoneView) => React.ReactNode;
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">No dates set yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {milestones.map((m) => {
        const done = m.completedAt !== null;
        const due = m.dueOn ? relativeDue(m.dueOn) : null;
        const late = !done && Boolean(due?.endsWith('late'));
        const tone = done ? 'done' : late ? 'late' : m.dueOn ? 'next' : 'none';

        return (
          <li key={m.id} className="flex items-center gap-3">
            <DateLeaf
              date={m.dueOn ? dayDate(m.dueOn) : done ? m.completedAt : null}
              tone={tone}
            />

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  done &&
                    'text-muted-foreground line-through decoration-emerald-400/60',
                )}
              >
                {m.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {done ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Check className="size-3.5" aria-hidden="true" />
                    Reached <BsDate date={m.completedAt!} />
                  </span>
                ) : m.dueOn ? (
                  <>
                    <BsDate date={dayDate(m.dueOn)} />
                    <span
                      className={cn(
                        'font-medium',
                        late ? 'text-rose-600' : 'text-amber-700',
                      )}
                    >
                      {' '}
                      · {due}
                    </span>
                  </>
                ) : (
                  'No date yet'
                )}
              </p>
            </div>

            {action ? <div className="shrink-0">{action(m)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

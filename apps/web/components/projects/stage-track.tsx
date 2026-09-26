import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { StageView } from '@/lib/projects/bundle';

/**
 * A project's stages as a numbered sequence (docs/DESIGN.md §7, client
 * portal: "numbered markers are appropriate here because the order carries
 * information a client needs").
 *
 * Vertical on a phone, horizontal from `md` up. The connector after a done
 * stage fills with colour, so progress reads along the line before any label
 * is read; the stage in progress glows.
 */
export function StageTrack({ stages }: { stages: StageView[] }) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The plan for this project is being put together.
      </p>
    );
  }

  return (
    <ol className="grid gap-0 md:auto-cols-fr md:grid-flow-col">
      {stages.map((stage, index) => {
        const last = index === stages.length - 1;
        const done = stage.status === 'done';
        const active = stage.status === 'in_progress';

        return (
          <li
            key={stage.id}
            aria-current={active ? 'step' : undefined}
            className="relative flex gap-4 pb-7 last:pb-0 md:flex-col md:gap-3 md:pb-0 md:pr-4"
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-1 left-[19px] top-11 w-0.5 rounded-full md:left-12 md:right-2 md:top-[19px] md:bottom-auto md:h-0.5 md:w-auto',
                  done
                    ? 'bg-gradient-to-b from-emerald-400 to-teal-400 md:bg-gradient-to-r'
                    : 'bg-border',
                )}
              />
            ) : null}

            <span
              className={cn(
                'relative z-10 grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-medium tabular-nums',
                done &&
                  'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-600/25',
                active &&
                  'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/35 ring-4 ring-violet-500/15',
                !done &&
                  !active &&
                  'border-2 border-dashed border-border bg-background text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              ) : (
                index + 1
              )}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-violet-500/40 motion-safe:animate-ping"
                />
              ) : null}
            </span>

            <div className="min-w-0 pt-1.5 md:pt-0">
              <p
                className={cn(
                  'text-sm font-semibold leading-snug',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {stage.name}
              </p>
              <p
                className={cn(
                  'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                  done && 'bg-emerald-500/10 text-emerald-700',
                  active && 'bg-violet-500/10 text-violet-700',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? 'Done' : active ? 'In progress' : 'Upcoming'}
              </p>
              {stage.description ? (
                <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
                  {stage.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

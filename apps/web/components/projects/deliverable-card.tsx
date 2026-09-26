import {
  CircleCheckBig,
  CircleDashed,
  ExternalLink,
  Eye,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import { BsDate } from '@/components/ui/bs-date';
import { cn } from '@/lib/cn';
import type { DeliverableView } from '@/lib/projects/bundle';
import {
  DELIVERABLE_ADMIN_LABEL,
  DELIVERABLE_LABEL,
  type DeliverableStatus,
} from '@/lib/projects/labels';

const LOOK: Record<
  DeliverableStatus,
  { icon: LucideIcon; chip: string; pill: string; edge: string }
> = {
  in_progress: {
    icon: CircleDashed,
    chip: 'bg-sky-500/12 text-sky-600',
    pill: 'bg-sky-500/10 text-sky-700',
    edge: 'before:bg-sky-400',
  },
  in_review: {
    icon: Eye,
    chip: 'bg-violet-500/12 text-violet-600',
    pill: 'bg-violet-500/10 text-violet-700',
    edge: 'before:bg-gradient-to-b before:from-violet-500 before:to-fuchsia-500',
  },
  approved: {
    icon: CircleCheckBig,
    chip: 'bg-emerald-500/12 text-emerald-600',
    pill: 'bg-emerald-500/10 text-emerald-700',
    edge: 'before:bg-emerald-500',
  },
  changes_requested: {
    icon: RotateCcw,
    chip: 'bg-amber-500/14 text-amber-600',
    pill: 'bg-amber-500/12 text-amber-700',
    edge: 'before:bg-amber-500',
  },
};

/**
 * One deliverable, with an icon and colour for its state. `side` picks whose
 * words the status is in — "Ready for your review" to a client is "With
 * client for review" to the admin. `children` holds the side's controls.
 */
export function DeliverableCard({
  deliverable: d,
  side,
  children,
}: {
  deliverable: DeliverableView;
  side: 'client' | 'admin';
  children?: React.ReactNode;
}) {
  const label = side === 'client' ? DELIVERABLE_LABEL : DELIVERABLE_ADMIN_LABEL;
  const look = LOOK[d.status];
  const Icon = look.icon;
  const waiting = side === 'client' && d.status === 'in_review';

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card py-3.5 pl-5 pr-4',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        look.edge,
        waiting
          ? 'border-violet-300/70 shadow-md shadow-violet-500/10'
          : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
            look.chip,
          )}
        >
          <Icon className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug">{d.title}</h3>
            <span
              className={cn(
                'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
                look.pill,
              )}
            >
              {label[d.status]}
            </span>
          </div>

          {d.description ? (
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
              {d.description}
            </p>
          ) : null}

          {d.linkUrl || (d.reviewedAt && d.reviewerName) ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {d.linkUrl ? (
                <a
                  href={d.linkUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-700"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Open it
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
              {d.reviewedAt && d.reviewerName ? (
                <span>
                  Reviewed by {d.reviewerName}, <BsDate date={d.reviewedAt} />
                </span>
              ) : null}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </article>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarClock, ClipboardCheck, Globe } from 'lucide-react';

import { BsDate } from '@/components/ui/bs-date';
import { StageProgress } from '@/components/projects/stage-progress';
import { cn } from '@/lib/cn';
import { projectArt } from '@/lib/portal/art';
import { dayDate, relativeDue } from '@/lib/projects/dates';
import { previewHost } from '@/lib/projects/preview';
import type { ProjectSummary } from '@/lib/projects/summaries';

import { StatusPill } from './status-pill';
import { TONE, toneFor } from './tone';

/**
 * One project: its picture and colour, where it stands, and what is next.
 * Shared with the admin's client page, which passes its own `href`.
 */
export function ProjectCard({
  summary,
  href,
}: {
  summary: ProjectSummary;
  href: string;
}) {
  const {
    project,
    stagesTotal,
    stagesDone,
    currentStage,
    nextMilestone,
    awaitingReview,
  } = summary;
  const tone = toneFor(project.id);
  const finished =
    project.status === 'completed' || project.status === 'cancelled';

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-float focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden="true"
        className={cn('h-1.5 bg-gradient-to-r', TONE[tone].bar)}
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'grid size-16 shrink-0 place-items-center rounded-2xl border',
              TONE[tone].soft,
            )}
          >
            <Image
              src={projectArt(project.id)}
              alt=""
              width={56}
              height={56}
              className="size-12 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="headline text-[17px] leading-snug">
                {project.name}
              </h3>
              <StatusPill status={project.status} />
            </div>
            {project.summary ? (
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                {project.summary}
              </p>
            ) : null}
            {project.previewSlug ? (
              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
                <span aria-hidden="true" className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate font-mono">
                  {previewHost(project.previewSlug)}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-foreground/80">
              {stagesTotal === 0
                ? finished
                  ? 'Finished'
                  : 'Plan coming soon'
                : stagesDone === stagesTotal
                  ? 'All stages done'
                  : `Now: ${currentStage}`}
            </span>
            {stagesTotal > 0 ? (
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {stagesDone}/{stagesTotal}
              </span>
            ) : null}
          </div>
          <StageProgress total={stagesTotal} done={stagesDone} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarClock
              className="size-3.5 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <span className="line-clamp-1">
              {nextMilestone ? (
                <>
                  {nextMilestone.title}
                  {nextMilestone.dueOn ? (
                    <>
                      {' · '}
                      <BsDate date={dayDate(nextMilestone.dueOn)} /> (
                      {relativeDue(nextMilestone.dueOn)})
                    </>
                  ) : null}
                </>
              ) : project.dueOn ? (
                <>
                  Due <BsDate date={dayDate(project.dueOn)} />
                </>
              ) : (
                'No dates set yet'
              )}
            </span>
          </span>

          {awaitingReview > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/12 px-2.5 py-1 font-medium text-violet-700 ring-1 ring-inset ring-violet-500/20">
              <ClipboardCheck className="size-3.5" aria-hidden="true" />
              {awaitingReview} to review
            </span>
          ) : (
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

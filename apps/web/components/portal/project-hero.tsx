import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Flag, ListChecks } from 'lucide-react';

import type { Project } from '@softmato/db';

import { BsDate } from '@/components/ui/bs-date';
import { StageProgress } from '@/components/projects/stage-progress';
import { projectScene } from '@/lib/portal/art';
import { dayDate, relativeDue } from '@/lib/projects/dates';

import { StatusPill } from './status-pill';

function Chip({
  icon: Icon,
  className,
  children,
}: {
  icon: typeof Flag;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm ring-1 ring-inset ring-border backdrop-blur">
      <Icon className={`size-3.5 ${className}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** The top of a project page: name, state, dates, progress and its scene. */
export function ProjectHero({
  project,
  stagesDone,
  stagesTotal,
}: {
  project: Project;
  stagesDone: number;
  stagesTotal: number;
}) {
  const scene = projectScene(project.id);

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-100 bg-[linear-gradient(120deg,#ecfdf5_0%,#ffffff_48%,#f5f3ff_100%)] p-6 shadow-card sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-violet-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-16 -z-10 size-72 rounded-full bg-emerald-200/50 blur-3xl"
      />

      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-emerald-700"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All projects
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="display text-[30px] sm:text-[40px]">
              {project.name}
            </h1>
            <StatusPill status={project.status} />
          </div>

          {project.summary ? (
            <p className="mt-3 max-w-[62ch] whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {project.summary}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {project.startsOn ? (
              <Chip icon={CalendarDays} className="text-sky-600">
                Started <BsDate date={dayDate(project.startsOn)} />
              </Chip>
            ) : null}
            {project.dueOn ? (
              <Chip icon={Flag} className="text-rose-500">
                Due <BsDate date={dayDate(project.dueOn)} />
                {project.status === 'active'
                  ? ` · ${relativeDue(project.dueOn)}`
                  : ''}
              </Chip>
            ) : null}
            {stagesTotal > 0 ? (
              <Chip icon={ListChecks} className="text-emerald-600">
                {stagesDone} of {stagesTotal} stages done
              </Chip>
            ) : null}
          </div>

          {stagesTotal > 0 ? (
            <StageProgress
              total={stagesTotal}
              done={stagesDone}
              className="mt-5 max-w-md"
            />
          ) : null}
        </div>

        <Image
          src={scene.src}
          alt=""
          width={scene.width}
          height={scene.height}
          priority
          sizes="300px"
          className="hidden w-[260px] drop-shadow-xl md:block lg:w-[300px]"
        />
      </div>
    </section>
  );
}

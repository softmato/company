import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Globe,
  Lock,
  MessagesSquare,
  MonitorSmartphone,
  Monitor,
  Route,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react';

import { Drift } from '@/components/motion/drift';
import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { IconChip } from '@/components/portal/icon-chip';
import type { Tone } from '@/components/portal/tone';
import {
  PORTAL_HOST,
  PREVIEW_HEADING,
  PREVIEW_HOST,
  PREVIEW_LEDE,
  PREVIEW_POINTS,
} from '@/lib/home/live-preview';

const POINT_LOOK: Record<
  (typeof PREVIEW_POINTS)[number]['key'],
  { icon: LucideIcon; tone: Tone }
> = {
  preview: { icon: Globe, tone: 'emerald' },
  devices: { icon: MonitorSmartphone, tone: 'violet' },
  stages: { icon: Route, tone: 'sky' },
  thread: { icon: MessagesSquare, tone: 'amber' },
};

const SITE_ICONS = [
  '/home/believe/web.webp',
  '/home/believe/app.webp',
  '/home/believe/ui.webp',
];

/** Grey placeholder lines standing in for a page's text. */
function Lines({
  widths,
  className,
}: {
  widths: string[];
  className?: string;
}) {
  return (
    <span className={className}>
      {widths.map((w, i) => (
        <span
          key={i}
          className="mt-1.5 block h-1.5 rounded-full bg-slate-200 first:mt-0"
          style={{ width: w }}
        />
      ))}
    </span>
  );
}

/** The client's site, drawn: nav, a hero with its picture, three cards. */
function DrawnSite({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_45%,#f5f3ff_100%)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="size-4 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600" />
        <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        {compact ? (
          <span className="ml-auto grid gap-0.5">
            <span className="h-0.5 w-3.5 rounded bg-slate-400" />
            <span className="h-0.5 w-3.5 rounded bg-slate-400" />
          </span>
        ) : (
          <span className="ml-auto flex gap-3">
            <span className="h-1.5 w-8 rounded-full bg-slate-200" />
            <span className="h-1.5 w-8 rounded-full bg-slate-200" />
            <span className="h-1.5 w-8 rounded-full bg-slate-200" />
            <span className="h-4 w-14 rounded-full bg-emerald-500" />
          </span>
        )}
      </div>

      <div
        className={
          compact
            ? 'px-4 pb-4 pt-2'
            : 'grid grid-cols-[1fr_1.05fr] items-center gap-6 px-8 pb-8 pt-4'
        }
      >
        <div>
          <span className="inline-block h-3 w-16 rounded-full bg-violet-200" />
          <span className="mt-3 block h-4 w-[92%] rounded-md bg-slate-800" />
          <span className="mt-2 block h-4 w-[70%] rounded-md bg-slate-800" />
          <Lines widths={['100%', '94%', '60%']} className="mt-4 block" />
          <span className="mt-4 flex gap-2">
            <span className="h-6 w-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm" />
            {compact ? null : (
              <span className="h-6 w-16 rounded-full ring-1 ring-inset ring-slate-300" />
            )}
          </span>
        </div>
        {compact ? null : (
          <Image
            src="/home/services/web-applications.webp"
            alt=""
            width={1100}
            height={565}
            sizes="420px"
            className="w-full drop-shadow-xl"
          />
        )}
      </div>

      <div
        className={
          compact ? 'grid gap-2 px-4 pb-5' : 'grid grid-cols-3 gap-4 px-8 pb-8'
        }
      >
        {(compact ? SITE_ICONS.slice(0, 2) : SITE_ICONS).map((src) => (
          <span
            key={src}
            className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70"
          >
            <Image
              src={src}
              alt=""
              width={40}
              height={40}
              className="size-9 shrink-0"
            />
            <Lines widths={['80%', '55%']} className="block flex-1" />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The live-preview chapter: a browser window open on a client's site at its
 * own softmato.com address, the same page on a phone beside it, and what the
 * portal holds under it. The one chapter shaped as a product shot.
 *
 * All drawn, all decorative (`aria-hidden`) — the heading, lede and points
 * carry the meaning. The only motion is the phone's slow bob and the points'
 * arrival, both paused off screen by their components.
 */
export function PreviewSection() {
  return (
    <section
      id="client-portal"
      className="stage px-6 pb-24 pt-20 sm:pb-32 sm:pt-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-[44rem] text-center">
          <p className="eyebrow">Client portal · {PORTAL_HOST}</p>
          <ToneReveal
            sentence={PREVIEW_HEADING}
            className="headline mx-auto mt-6 max-w-[15ch] text-[clamp(2rem,5.2vw,3.75rem)] leading-[1.06]"
          />
          <p className="mx-auto mt-6 max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground">
            {PREVIEW_LEDE}
          </p>
        </div>

        <div aria-hidden="true" className="relative mx-auto mt-14 max-w-5xl">
          <div className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(50%_60%_at_30%_40%,rgba(16,185,129,0.18),transparent),radial-gradient(40%_50%_at_80%_70%,rgba(139,92,246,0.16),transparent)] blur-2xl" />

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </span>
              <span className="mx-auto flex min-w-0 max-w-md flex-1 items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 font-mono text-[12.5px] shadow-inner ring-1 ring-inset ring-slate-200">
                <Lock className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  <span className="hidden text-slate-400 sm:inline">https://</span>
                  <span className="font-semibold text-slate-900">
                    {PREVIEW_HOST}
                  </span>
                </span>
              </span>
              <span className="hidden items-center gap-0.5 rounded-full bg-slate-100 p-0.5 sm:flex">
                <span className="grid size-7 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
                  <Monitor className="size-3.5" />
                </span>
                <span className="grid size-7 place-items-center text-slate-400">
                  <Tablet className="size-3.5" />
                </span>
                <span className="grid size-7 place-items-center text-slate-400">
                  <Smartphone className="size-3.5" />
                </span>
              </span>
            </div>

            <div className="relative">
              <span className="absolute right-4 top-14 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11.5px] font-semibold text-white shadow-lg shadow-emerald-700/30">
                <span className="live-dot size-1.5 rounded-full bg-white" />
                Live preview
              </span>
              <div className="hidden sm:block">
                <DrawnSite />
              </div>
              <div className="sm:hidden">
                <DrawnSite compact />
              </div>
            </div>
          </div>

          <div className="absolute -bottom-10 -right-4 hidden w-[12.5rem] lg:block xl:-right-12">
            <Drift distance={10} duration={6}>
              <div className="overflow-hidden rounded-[2rem] border-[7px] border-slate-900 bg-white shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)]">
                <div className="mx-auto mt-1.5 h-1.5 w-12 rounded-full bg-slate-900" />
                <DrawnSite compact />
              </div>
            </Drift>
          </div>
        </div>

        <StaggerIn
          as="ul"
          onScroll
          className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PREVIEW_POINTS.map((point) => {
            const look = POINT_LOOK[point.key];
            return (
              <li key={point.key} className="float-card p-5">
                <IconChip icon={look.icon} tone={look.tone} size="md" solid />
                <p className="mt-4 text-[15px] font-semibold text-foreground">
                  {point.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </li>
            );
          })}
        </StaggerIn>

        <div className="mt-10 flex justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-700/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Start a project
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import {
  ArrowRight,
  Globe,
  MessagesSquare,
  MonitorSmartphone,
  Route,
  type LucideIcon,
} from 'lucide-react';

import { StaggerIn } from '@/components/motion/stagger-in';
import { ToneReveal } from '@/components/motion/tone-reveal';
import { IconChip } from '@/components/portal/icon-chip';
import type { Tone } from '@/components/portal/tone';
import {
  PORTAL_HOST,
  PREVIEW_HEADING,
  PREVIEW_LEDE,
  PREVIEW_POINTS,
} from '@/lib/home/live-preview';

import { LiveBuild } from './live-build';

const POINT_LOOK: Record<
  (typeof PREVIEW_POINTS)[number]['key'],
  { icon: LucideIcon; tone: Tone }
> = {
  preview: { icon: Globe, tone: 'emerald' },
  devices: { icon: MonitorSmartphone, tone: 'violet' },
  stages: { icon: Route, tone: 'sky' },
  thread: { icon: MessagesSquare, tone: 'amber' },
};

/**
 * The live-preview chapter: a browser window open on a client's site at its
 * own softmato.com address, the same page on a phone beside it, and what the
 * portal holds under it. The one chapter shaped as a product shot.
 *
 * The browser plays a build (`LiveBuild`): the site assembled section by
 * section, a client message, the engineer's answer, the site changing to
 * match. Decorative (`aria-hidden`) — the heading, lede and points carry the
 * meaning.
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

        <LiveBuild />

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

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-emerald-700/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Start a project
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/client-portal"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            See the portal demo
          </Link>
        </div>
      </div>
    </section>
  );
}

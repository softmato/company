'use client';

import { Lock, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Drift } from '@/components/motion/drift';
import { cn } from '@/lib/cn';
import {
  CURSOR_ANCHOR,
  SCENES,
  type Region,
  type Scene,
} from '@/lib/home/live-build';
import { PREVIEW_HOST } from '@/lib/home/live-preview';
import { useMotionEnabled } from '@/lib/motion/use-motion-enabled';

import { LiveBuildBadge, LiveBuildChat } from './live-build-chat';
import { LiveBuildCursor } from './live-build-cursor';
import { BuildContext, type BuildState } from './live-build-parts';
import { LiveBuildSite } from './live-build-site';

type Step = {
  scene: Scene;
  ms: number;
  focus: Region;
  editing?: readonly Region[];
  cursor?: Region;
  log?: string;
};

const STEPS: readonly Step[] = SCENES;
const LAST = STEPS.length - 1;
const indexOf = (scene: Scene) => STEPS.findIndex((s) => s.scene === scene);

/** The address bar's size switch; the site reflows by container query. */
const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '46rem' },
  { id: 'phone', label: 'Phone', icon: Smartphone, width: '24rem' },
] as const;

type Device = (typeof DEVICES)[number]['id'];

/** A region's top and bottom in the scroll container's content coordinates. */
function span(view: HTMLElement, region: Region) {
  const el = view.querySelector<HTMLElement>(`[data-region="${region}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = r.top - view.getBoundingClientRect().top + view.scrollTop;
  return { top, bottom: top + r.height, rect: r };
}

/**
 * Scrolls `view` the least it takes to show `region` whole (or its top, if it
 * is taller than the view), and returns where it will come to rest.
 */
function follow(view: HTMLElement, region: Region, smooth: boolean) {
  const box = span(view, region);
  const h = view.clientHeight;
  const max = Math.max(0, view.scrollHeight - h);
  if (!box) return view.scrollTop;

  const pad = 28;
  const cur = view.scrollTop;
  let next = cur;
  if (region === 'header') next = 0;
  else if (box.top - pad < cur || box.bottom - box.top + pad * 2 > h)
    next = box.top - pad;
  else if (box.bottom + pad > cur + h) next = box.bottom + pad - h;
  next = Math.min(Math.max(next, 0), max);

  view.scrollTo({ top: next, behavior: smooth ? 'smooth' : 'auto' });
  return next;
}

/** Moves the cursor to a region's anchor, as it will sit once scrolled. */
function aim(
  view: HTMLElement,
  cursor: HTMLElement,
  region: Region,
  scrollTo: number,
) {
  const box = span(view, region);
  if (!box) return;
  const v = view.getBoundingClientRect();
  // The cursor sits in the whole preview area; the page may be narrower.
  const frame = (cursor.offsetParent ?? view).getBoundingClientRect();
  const [fx, fy] = CURSOR_ANCHOR[region];
  const x = box.rect.left - frame.left + box.rect.width * fx;
  const y =
    v.top -
    frame.top +
    box.top -
    scrollTo +
    Math.min(box.rect.height * fy, v.height * 0.62);
  const cx = Math.min(Math.max(x, 16), frame.width - 150);
  const cy = Math.min(Math.max(y, 16), frame.height - 90);
  cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
}

/**
 * The live-preview chapter's centrepiece: a café site built on screen at
 * your-project.softmato.com, eight sections, the developer's cursor moving to
 * each as it is built; a client message, the engineer's answer, and the
 * header and hero changing to match; then the rest, the footer, and round
 * again. A phone beside it shows the same build at phone width.
 *
 * The script is `lib/home/live-build.ts`. It advances on timers only while
 * the browser is on screen; with reduced motion it shows the finished site.
 * Scrolling is the browser's own, on the preview's scroll container; the
 * cursor moves by transform.
 */
export function LiveBuild() {
  const root = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const still = !useMotionEnabled();

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.3 },
    );
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still || !visible) return;
    const id = setTimeout(() => {
      if (step === LAST) {
        setCycle((c) => c + 1);
        setStep(0);
      } else {
        setStep(step + 1);
      }
    }, STEPS[step]!.ms);
    return () => clearTimeout(id);
  }, [step, visible, still]);

  const shown = still ? LAST : step;
  const current = STEPS[shown]!;

  useEffect(() => {
    const smooth = !still && shown !== 0;
    const place = () => {
      if (view.current) {
        const rest = follow(view.current, current.focus, smooth);
        if (cursor.current && current.cursor)
          aim(view.current, cursor.current, current.cursor, rest);
      }
      if (phone.current) follow(phone.current, current.focus, smooth);
    };
    place();
    // Again once a size switch has finished resizing the page.
    const id = setTimeout(place, 560);
    return () => clearTimeout(id);
  }, [current, shown, cycle, still, device]);

  const log =
    STEPS.slice(0, shown + 1)
      .map((s) => s.log)
      .filter(Boolean)
      .at(-1) ?? 'waiting for changes';

  const build: BuildState = {
    at: (s) => shown >= indexOf(s),
    editing: current.editing ?? [],
  };
  const updating = current.scene === 'update';

  return (
    <BuildContext value={build}>
      <div
        ref={root}
        className="relative left-1/2 mt-14 w-[min(90vw,80rem)] -translate-x-1/2"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-x-6 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(45%_55%_at_20%_30%,rgba(16,185,129,0.16),transparent),radial-gradient(40%_50%_at_85%_75%,rgba(249,115,22,0.14),transparent)] blur-2xl"
        />

        <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_50px_100px_-40px_rgba(15,23,42,0.45)] ring-1 ring-slate-200">
          <div className="relative flex items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-2.5">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </span>
            <span
              aria-hidden="true"
              className="mx-auto flex min-w-0 max-w-md flex-1 items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 font-mono text-[12.5px] shadow-inner ring-1 ring-inset ring-slate-200"
            >
              <Lock className="size-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">
                <span className="hidden text-slate-400 sm:inline">
                  https://
                </span>
                <span className="font-semibold text-slate-900">
                  {PREVIEW_HOST}
                </span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold text-white shadow-md transition-colors md:inline-flex',
                updating ? 'build-flash bg-amber-500' : 'bg-emerald-600',
              )}
            >
              <span className="live-dot size-1.5 rounded-full bg-white" />
              {updating ? 'Updating live' : 'Live preview'}
            </span>
            <div
              role="group"
              aria-label="Preview size"
              className="hidden items-center gap-0.5 rounded-full bg-slate-100 p-0.5 sm:flex"
            >
              {DEVICES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`${label} preview`}
                  aria-pressed={device === id}
                  onClick={() => setDevice(id)}
                  className={cn(
                    'grid size-7 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                    device === id
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
            <span
              aria-hidden="true"
              key={`${cycle}-${current.scene}`}
              className="build-progress absolute inset-x-0 -bottom-px h-0.5 origin-left bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
          </div>

          <div
            aria-hidden="true"
            className={cn(
              'relative h-[max(80vh,34rem)] transition-colors duration-500',
              device !== 'desktop' && 'bg-slate-100',
            )}
          >
            <div
              ref={view}
              className={cn(
                'mx-auto h-full overflow-hidden bg-white transition-[max-width,box-shadow] duration-500 ease-out',
                device !== 'desktop' &&
                  'shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_24px_50px_-24px_rgba(15,23,42,0.35)]',
              )}
              style={{ maxWidth: DEVICES.find((d) => d.id === device)!.width }}
            >
              <LiveBuildSite key={cycle} />
            </div>

            <div
              className={cn(
                'pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500',
                build.at('header') ? 'opacity-0' : 'opacity-100',
              )}
            >
              <span className="grid justify-items-center gap-3 text-center">
                <span className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-500" />
                <span className="text-[14px] font-semibold text-slate-800">
                  Starting a fresh build…
                </span>
                <span className="font-mono text-[11.5px] text-slate-400">
                  your-project · main
                </span>
              </span>
            </div>

            <div className="hidden md:block">
              <LiveBuildCursor ref={cursor} clickKey={`${cycle}-${shown}`} />
            </div>
            <LiveBuildBadge log={log} />
          </div>
        </div>

        <LiveBuildChat
          aria-hidden
          className="mx-auto mt-6 lg:absolute lg:bottom-[9%] lg:left-[-1.5rem] lg:z-30 lg:mt-0"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-12 -right-5 z-30 hidden w-[13.5rem] xl:block"
        >
          <Drift distance={10} duration={6}>
            <div className="overflow-hidden rounded-[2.2rem] border-[7px] border-slate-900 bg-slate-900 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.5)]">
              <div
                ref={phone}
                className="h-[28rem] overflow-hidden rounded-[1.7rem] bg-white"
              >
                <div style={{ zoom: 0.5 }}>
                  <LiveBuildSite key={cycle} />
                </div>
              </div>
            </div>
          </Drift>
        </div>
      </div>
    </BuildContext>
  );
}

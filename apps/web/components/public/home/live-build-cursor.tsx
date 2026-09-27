'use client';

import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

import {
  CursorFollow,
  CursorProvider,
} from '@/components/animate-ui/components/animate/cursor';
import { Cursor } from '@/components/animate-ui/primitives/animate/cursor';
import { CURSOR_PATH, type Region } from '@/lib/home/live-build';

import { WorkAvatar } from './work-avatar';

/** animate-ui's cursor arrow. */
function Arrow({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`size-[22px] drop-shadow-[0_3px_5px_rgba(15,23,42,0.35)] ${className}`}
    >
      <path
        fill="currentColor"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
        d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
      />
    </svg>
  );
}

export type CursorPath = {
  region: Region;
  /** `data-cursor` elements to visit instead of the region's own path. */
  targets?: readonly string[] | undefined;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), Math.max(lo, hi));

/**
 * The `hop`th point of a path, in the preview area's pixels, as it will sit
 * once the browser has scrolled to `rest`.
 */
function aimAt(
  view: HTMLElement,
  frame: HTMLElement,
  path: CursorPath,
  hop: number,
  rest: number,
  low: boolean,
) {
  let el: HTMLElement | null = null;
  let [fx, fy] = [0.5, 0.5];
  if (path.targets?.length) {
    const name = path.targets[hop % path.targets.length];
    el = view.querySelector<HTMLElement>(`[data-cursor="${name}"]`);
    // Hidden at this width (a nav under a container query): use the region.
    if (el && el.getBoundingClientRect().width === 0) el = null;
  }
  if (!el) {
    el = view.querySelector<HTMLElement>(`[data-region="${path.region}"]`);
    const points = CURSOR_PATH[path.region];
    [fx, fy] = points[hop % points.length]!;
  }
  if (!el) return null;

  const r = el.getBoundingClientRect();
  const v = view.getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  const top = r.top - f.top + (view.scrollTop - rest);
  const viewTop = v.top - f.top;
  return {
    x: clamp(r.left - f.left + r.width * fx, 24, f.width - 150),
    y: clamp(
      top + Math.min(r.height * fy, v.height * 0.7),
      viewTop + 24,
      viewTop + v.height * (low ? 0.48 : 1) - 72,
    ),
  };
}

/**
 * The developer's pointer (animate-ui's Cursor, driven by the build rather
 * than a mouse). It never rests: through each section as it is built — logo,
 * nav, buttons; headline, buttons, photo — pressing at each stop, and in the
 * server half onto whatever is being wired up (Order ahead, Sign in). The
 * glide is the cursor's spring, with a slow wander on top. Its own timer and
 * state, so its motion re-renders nothing else.
 */
export function DeveloperCursor({
  view,
  frame,
  rest,
  path,
  sceneKey,
  low,
  running,
}: {
  view: RefObject<HTMLDivElement | null>;
  frame: RefObject<HTMLDivElement | null>;
  /** Where the preview is scrolling to, in its content pixels. */
  rest: RefObject<number>;
  path?: CursorPath | undefined;
  /** Changes with every scene; the path starts over. */
  sceneKey: string;
  /** The lower half of the preview is covered by the network panel. */
  low: boolean;
  running: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number }>();
  const [hop, setHop] = useState(0);
  const [scene, setScene] = useState(sceneKey);
  if (scene !== sceneKey) {
    setScene(sceneKey);
    setHop(0);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setHop((h) => h + 1), 1250);
    return () => clearInterval(id);
  }, [running, sceneKey]);

  const region = path?.region;
  const targets = path?.targets;
  useEffect(() => {
    if (!region) return;
    const place = () => {
      if (!view.current || !frame.current) return;
      const to = aimAt(
        view.current,
        frame.current,
        { region, targets },
        hop,
        rest.current,
        low,
      );
      if (to) setPos(to);
    };
    // Two frames: after the chapter has started the scroll this aims past.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(place);
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [region, targets, hop, sceneKey, low, view, frame, rest]);

  if (!pos) return null;
  return (
    <CursorProvider
      position={pos}
      className="pointer-events-none absolute inset-0"
    >
      <Cursor>
        <span
          className="cursor-wander block"
          style={{ '--wander': '5.5s' } as CSSProperties}
        >
          <span key={`${sceneKey}-${hop}`} className="build-press block">
            <Arrow className="text-slate-950" />
          </span>
        </span>
      </Cursor>
      <CursorFollow className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 py-1 pl-1 pr-3 text-[11.5px] font-semibold text-white shadow-lg shadow-emerald-900/25">
        <WorkAvatar who="engineer" className="size-5" />
        Developer
      </CursorFollow>
    </CursorProvider>
  );
}

/**
 * The visitor's own pointer over the preview, drawn the same way and tagged
 * "You" in the client's amber — two people in one live preview, as in the
 * portal. Follows the real mouse over its parent (the preview, which must
 * be its direct parent); touch screens keep their own.
 */
export function VisitorCursor() {
  return (
    <CursorProvider className="pointer-events-none absolute inset-0 z-30 hidden pointer-fine:block">
      <Cursor>
        <Arrow className="text-amber-500" />
      </Cursor>
      <CursorFollow className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500 py-1 pl-1 pr-3 text-[11.5px] font-semibold text-white shadow-lg shadow-amber-900/20">
        <WorkAvatar who="client" className="size-5" />
        You
      </CursorFollow>
    </CursorProvider>
  );
}

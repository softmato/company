'use client';

import {
  Check,
  DatabaseZap,
  Gauge,
  KeyRound,
  PanelsTopLeft,
  Pause,
  Play,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { LAYERS, type Layer } from '@/lib/home/live-build';

const ICON: Record<Layer, LucideIcon> = {
  ui: PanelsTopLeft,
  api: Server,
  auth: KeyRound,
  roles: ShieldCheck,
  cache: DatabaseZap,
  perf: Gauge,
};

/**
 * The layers of the stack the build works through, over the editor and the
 * browser: the one being worked on lit, the finished ones ticked. Each is a
 * button that jumps the build there and plays on; the last holds the build
 * still (moving content needs a way to stop it) and lets it go again. Under
 * it, what the current layer means in plain words.
 */
export function LiveBuildLayers({
  layer,
  complete,
  paused,
  onPick,
  onToggle,
}: {
  layer: Layer;
  /** The build has finished every layer. */
  complete: boolean;
  paused: boolean;
  onPick: (layer: Layer) => void;
  onToggle: () => void;
}) {
  const current = LAYERS.findIndex((l) => l.id === layer);
  const { label, note } = LAYERS[current]!;

  return (
    <div className="grid justify-items-center gap-4">
      <ol
        aria-label="Layers of the build"
        className="flex max-w-full flex-wrap justify-center gap-1 rounded-3xl bg-white/85 p-1.5 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.4)] ring-1 ring-slate-200 sm:rounded-full"
      >
        {LAYERS.map((l, i) => {
          const Icon = ICON[l.id];
          const state =
            complete || i < current ? 'done' : i === current ? 'now' : 'next';
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onPick(l.id)}
                aria-current={state === 'now' ? 'step' : undefined}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  state === 'now' && 'bg-slate-950 text-white shadow-md',
                  state === 'done' && 'text-emerald-800 hover:bg-emerald-50',
                  state === 'next' &&
                    'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full transition-colors duration-300',
                    state === 'now' && 'bg-emerald-400 text-slate-950',
                    state === 'done' && 'bg-emerald-100 text-emerald-700',
                    state === 'next' && 'bg-slate-100 text-slate-500',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  ) : (
                    <Icon className="size-3.5" aria-hidden />
                  )}
                </span>
                {l.label}
              </button>
            </li>
          );
        })}
        <li className="flex items-center border-slate-200 pl-1 sm:ml-1 sm:border-l">
          <button
            type="button"
            onClick={onToggle}
            aria-label={paused ? 'Play the build' : 'Pause the build'}
            title={paused ? 'Play the build' : 'Pause the build'}
            className={cn(
              'grid size-9 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
              paused
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {paused ? (
              <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
            ) : (
              <Pause className="size-3.5 fill-current" aria-hidden />
            )}
          </button>
        </li>
      </ol>

      <p
        key={layer}
        className="build-log min-h-[3.2em] max-w-[52rem] text-center text-[14.5px] text-muted-foreground sm:min-h-0"
      >
        <span className="font-semibold text-foreground">{label}.</span> {note}
      </p>
    </div>
  );
}

'use client';

import { Check, LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { CHAT } from '@/lib/home/live-build';

import { Typed, useBuild } from './live-build-parts';
import { WorkAvatar } from './work-avatar';

/** Three bouncing dots that stand in until the words start arriving. */
function Dots() {
  return (
    <span className="build-dots absolute left-3 top-1/2 flex -translate-y-1/2 gap-1">
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

const TASKS = ['Header → dark', 'New headline + photo'];

/**
 * The conversation beside the build. The client's message is lit — amber
 * ring, a pulse — so it is read first; it types in word by word, then the
 * engineer's answer does, with the two changes listed under it. They tick
 * the moment the site behind changes to match.
 */
export function LiveBuildChat({
  className,
  'aria-hidden': hidden,
}: {
  className?: string;
  'aria-hidden'?: boolean;
}) {
  const { at } = useBuild();
  const client = at('client') && !at('gallery');
  const engineer = at('reply') && !at('gallery');
  const done = at('update');

  return (
    <div
      aria-hidden={hidden}
      className={cn('grid w-[19rem] max-w-full gap-3', className)}
    >
      <div
        className={cn(
          'rounded-2xl bg-white p-3.5 shadow-[0_24px_50px_-20px_rgba(15,23,42,0.45)] transition-[opacity,translate] duration-500',
          client
            ? 'build-ping opacity-100 ring-2 ring-amber-400'
            : 'translate-y-3 opacity-0',
        )}
      >
        <p className="flex items-center gap-2 text-[11.5px] font-semibold text-amber-700">
          <WorkAvatar who="client" className="size-6" />
          Client
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px]">
            New message
          </span>
        </p>
        <p className="relative mt-2.5 rounded-2xl rounded-tl-md bg-amber-50 px-3 py-2.5 text-[13px] leading-snug text-slate-900">
          {client ? <Dots /> : null}
          <Typed text={CHAT.client} on={client} delay={900} />
        </p>
      </div>

      <div
        className={cn(
          'ml-6 rounded-2xl bg-white p-3.5 shadow-[0_24px_50px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 transition-[opacity,translate] duration-500',
          engineer ? 'opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <p className="flex items-center gap-2 text-[11.5px] font-semibold text-emerald-700">
          <WorkAvatar who="engineer" className="size-6" />
          Engineer
        </p>
        <p className="relative mt-2.5 rounded-2xl rounded-tl-md bg-emerald-600 px-3 py-2.5 text-[13px] leading-snug text-white">
          {engineer ? <Dots /> : null}
          <Typed text={CHAT.engineer} on={engineer} delay={900} />
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {TASKS.map((task) => (
            <li
              key={task}
              className="flex items-center gap-2 text-[12px] text-slate-600"
            >
              {done ? (
                <span className="grid size-4 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : (
                <LoaderCircle className="size-4 animate-spin text-slate-400" />
              )}
              <span className={cn(done && 'text-slate-900')}>{task}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The dev-tools badge docked in the preview: "Powered by softmato" + a log. */
export function LiveBuildBadge({ log }: { log: string }) {
  const shown = useBuild().at('devtools');

  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-slate-950/95 py-1.5 pl-1.5 pr-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur transition-[opacity,translate] duration-500',
        shown ? 'opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
        <span className="live-dot size-1.5 rounded-full bg-emerald-400" />
        Powered by softmato
      </span>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">
        Dev tools
      </span>
      <span
        key={log}
        className="build-log font-mono text-[11px] text-emerald-300"
      >
        {log}
      </span>
    </div>
  );
}

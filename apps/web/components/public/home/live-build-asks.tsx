'use client';

import { Check, MessageSquarePlus, MousePointerClick, Undo2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { ASKS, type Tweak } from '@/lib/home/live-build-asks';

import { WorkAvatar } from './work-avatar';

/**
 * Under the build: the visitor plays the client. Each ask is a message to
 * the developer, who answers, types the change and puts it live — on the
 * visitor's copy of the café, where it stays until they undo it. One ask at
 * a time; one already showing on the site is ticked.
 */
export function LiveBuildAsks({
  busy,
  showing,
  mine,
  onAsk,
  onUndo,
}: {
  /** An ask is being worked on. */
  busy: boolean;
  /** Changes already on the site, the visitor's or the script's. */
  showing: ReadonlySet<Tweak>;
  /** Changes the visitor asked for. */
  mine: ReadonlySet<Tweak>;
  onAsk: (id: Tweak) => void;
  onUndo: () => void;
}) {
  return (
    <div className="mx-auto mt-16 grid max-w-[64rem] justify-items-center gap-3 sm:mt-20">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-white p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:rounded-full">
        <span className="flex items-center gap-2 px-2 text-[13px] font-semibold text-slate-800">
          <WorkAvatar who="client" className="size-7" />
          You’re the client — ask for a change
        </span>
        {ASKS.map((ask) => {
          const on = showing.has(ask.id);
          return (
            <button
              key={ask.id}
              type="button"
              disabled={busy || on}
              onClick={() => onAsk(ask.id)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-default',
                on
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 hover:-translate-y-px hover:bg-amber-100 disabled:opacity-50 disabled:hover:translate-y-0',
              )}
            >
              {on ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              ) : (
                <MessageSquarePlus className="size-3.5" aria-hidden />
              )}
              {ask.label}
            </button>
          );
        })}
        {mine.size ? (
          <button
            type="button"
            disabled={busy}
            onClick={onUndo}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
          >
            <Undo2 className="size-3.5" aria-hidden />
            Undo mine
          </button>
        ) : null}
      </div>
      <p className="flex items-center gap-1.5 text-center text-[12.5px] text-slate-500">
        <MousePointerClick className="size-3.5 shrink-0" aria-hidden />
        All of it is live: open a file, a tab, a request or any part of the site.
      </p>
    </div>
  );
}

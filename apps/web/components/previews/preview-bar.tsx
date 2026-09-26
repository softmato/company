'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  Check,
  ChevronUp,
  LayoutDashboard,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { BRAND_MARK_192 } from '@/lib/brand/assets';
import type { PreviewStatus } from '@/lib/projects/preview-status';

export interface Tech {
  name: string;
  role: string;
  colour: string;
}

const subscribe = () => () => {};

/**
 * Softmato's layer over a client's preview: where the build is, what it is
 * built with, and the door to the client portal. Collapsed, a small pill at
 * the foot of the page; open, a card above it.
 *
 * Not shown inside the portal's own browser frame — the page around it
 * already says all of this.
 */
export function PreviewBar({
  status,
  tech,
  portalUrl,
}: {
  status: PreviewStatus | null;
  tech: Tech[];
  portalUrl: string;
}) {
  const topLevel = useSyncExternalStore(
    subscribe,
    () => window.self === window.top,
    () => false,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!topLevel) return null;

  const stages = status?.stages ?? [];
  const done = stages.filter((s) => s.status === 'done').length;
  const current =
    stages.find((s) => s.status === 'in_progress') ??
    stages.find((s) => s.status === 'upcoming');

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4 font-sans">
      <section
        aria-label="About this preview"
        className={cn(
          'w-full max-w-[25rem] origin-bottom overflow-hidden rounded-[26px] bg-white text-slate-900 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.45)] ring-1 ring-slate-900/10 transition-[opacity,transform] duration-300 ease-out',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
        inert={!open}
      >
        <header className="flex items-start gap-3 bg-[linear-gradient(135deg,#053d2e,#047857_60%,#0f9f8a)] px-5 py-4 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-100/80">
              Site in progress
            </p>
            <p className="mt-1 text-[15px] font-semibold leading-snug">
              You are looking at the live build — it changes as the team works.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          {stages.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Progress · {done} of {stages.length}
              </p>
              <ol className="mt-3 space-y-2.5">
                {stages.map((stage) => (
                  <li
                    key={stage.name}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full',
                        stage.status === 'done' && 'bg-emerald-500 text-white',
                        stage.status === 'in_progress' &&
                          'bg-violet-500/15 ring-2 ring-violet-500',
                        stage.status === 'upcoming' &&
                          'ring-2 ring-inset ring-slate-200',
                      )}
                    >
                      {stage.status === 'done' ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : null}
                      {stage.status === 'in_progress' ? (
                        <span className="size-2 animate-pulse rounded-full bg-violet-500" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        stage.status === 'upcoming'
                          ? 'text-slate-400'
                          : 'text-slate-800',
                      )}
                    >
                      {stage.name}
                    </span>
                    {stage.status === 'in_progress' ? (
                      <span className="ml-auto rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        Now
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Built with
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {tech.map((t) => (
                <li
                  key={t.name}
                  className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200/70"
                >
                  <p className="flex items-center gap-1.5 text-[13px] font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: t.colour }}
                    />
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                    {t.role}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={portalUrl}
            className="group flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200/70 transition-colors hover:bg-emerald-100/70"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-emerald-900">
                Your client portal
              </span>
              <span className="block text-xs leading-snug text-emerald-800/70">
                Stages, this preview, files, messages and invoices — in one
                place.
              </span>
            </span>
            <ArrowUpRight
              className="size-4 text-emerald-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-full bg-[#0b1f17]/95 py-1.5 pl-1.5 pr-4 text-left text-white shadow-[0_16px_40px_-12px_rgba(2,6,23,0.6)] ring-1 ring-white/10 backdrop-blur transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-400/60"
      >
        <span className="grid size-8 place-items-center rounded-full bg-white">
          <Image src={BRAND_MARK_192} alt="" width={20} height={20} />
        </span>
        <span className="hidden text-[13px] font-medium sm:inline">
          Preview by Softmato
        </span>
        {current ? (
          <>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-white/20 sm:block"
            />
            <span className="text-[13px] text-emerald-200">{current.name}</span>
            <span aria-hidden="true" className="flex gap-0.5">
              {stages.map((stage) => (
                <span
                  key={stage.name}
                  className={cn(
                    'h-1.5 w-3 rounded-full',
                    stage.status === 'done'
                      ? 'bg-emerald-400'
                      : stage.status === 'in_progress'
                        ? 'bg-violet-400'
                        : 'bg-white/20',
                  )}
                />
              ))}
            </span>
            <span className="font-mono text-xs tabular-nums text-white/70">
              {done}/{stages.length}
            </span>
          </>
        ) : null}
        <ChevronUp
          className={cn(
            'size-4 text-white/70 transition-transform duration-300',
            open ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

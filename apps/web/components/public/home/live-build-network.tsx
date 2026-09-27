'use client';

import { cn } from '@/lib/cn';
import type { Request } from '@/lib/home/live-build';
import { fileName, type FileKey } from '@/lib/home/live-build-code';

const COLS =
  'grid grid-cols-[minmax(0,1fr)_3.25rem_4.25rem_3.75rem_minmax(0,7rem)] items-center gap-3';

const TABS = ['Elements', 'Console', 'Network', 'Application'];

/**
 * The browser's dev tools, docked over the bottom of the preview while the
 * server half of the build runs: every request the café site makes, its
 * status and time, and a waterfall bar that makes the cache hit's 3 ms look
 * as short as it is. A row is a link to its source — clicking one opens the
 * file that answered it.
 */
export function LiveBuildNetwork({
  shown,
  rows,
  selected,
  onOpen,
}: {
  shown: boolean;
  rows: readonly Request[];
  /** The file open in the editor; its rows are lit. */
  selected?: FileKey | undefined;
  onOpen: (file: FileKey) => void;
}) {
  return (
    <section
      aria-label="Network requests"
      inert={!shown}
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 flex h-[46%] flex-col border-t border-white/10 bg-[#0f1413] text-[11.5px] text-white/70 shadow-[0_-24px_48px_-24px_rgba(15,23,42,0.55)] transition-transform duration-500 ease-out',
        shown ? 'translate-y-0' : 'translate-y-[105%]',
      )}
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-5 border-b border-white/[0.08] px-4"
      >
        {TABS.map((tab) => (
          <span
            key={tab}
            className={cn(
              'py-2',
              tab === 'Network'
                ? 'border-b-2 border-emerald-400 font-semibold text-white'
                : 'text-white/40',
            )}
          >
            {tab}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-white/45">
          <span className="live-dot size-1.5 rounded-full bg-rose-500" />
          Recording
        </span>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          COLS,
          'border-b border-white/[0.06] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35',
        )}
      >
        <span>Name</span>
        <span>Status</span>
        <span>Type</span>
        <span>Time</span>
        <span>Waterfall</span>
      </div>

      <ul className="editor-scroll min-h-0 flex-1 overflow-y-auto">
        {rows.map((row, i) => (
          <li key={`${row.method} ${row.path} ${i}`}>
            <button
              type="button"
              onClick={() => onOpen(row.file)}
              aria-label={`${row.method} ${row.path}, ${row.status} in ${row.ms} ms — open ${fileName(row.file)}`}
              className={cn(
                COLS,
                'build-log w-full cursor-pointer px-4 py-[7px] text-left font-mono transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.07] focus-visible:outline-none',
                row.file === selected && 'bg-emerald-400/[0.1]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-semibold',
                    row.method === 'POST' ? 'text-violet-300' : 'text-sky-300',
                  )}
                >
                  {row.method}
                </span>
                <span className="truncate text-white/90">{row.path}</span>
                {row.note ? (
                  <span className="hidden truncate rounded bg-white/[0.06] px-1.5 py-px font-sans text-[10px] text-white/55 sm:inline">
                    {row.note}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'font-semibold',
                  row.status < 300 ? 'text-emerald-300' : 'text-amber-300',
                )}
              >
                {row.status}
              </span>
              <span className="text-white/45">{row.type}</span>
              <span className="text-white/65">{row.ms} ms</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    row.status < 300 ? 'bg-emerald-400/80' : 'bg-amber-400/80',
                  )}
                  style={{ width: `${Math.min(100, 6 + row.ms * 0.62)}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

'use client';

import {
  Blocks,
  Bug,
  ChevronRight,
  CircleUser,
  CircleX,
  Ellipsis,
  Files as FilesIcon,
  GitBranch,
  Search,
  Settings,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { FILES, fileName, type FileKey } from '@/lib/home/live-build-code';
import type { Timeline } from '@/lib/home/live-build-timeline';

import { LiveBuildExplorer, glyphFor } from './live-build-explorer';
import { LiveBuildTyping } from './live-build-typing';
import { WorkAvatar } from './work-avatar';

/** The animate-ui tree reads these tokens; here they are the dark editor's. */
const TOKENS = {
  '--accent': 'rgba(255, 255, 255, 0.06)',
  '--border': 'rgba(255, 255, 255, 0.08)',
} as CSSProperties;

const LANGUAGE = {
  tsx: 'TypeScript JSX',
  ts: 'TypeScript',
  json: 'JSON',
  css: 'CSS',
};

/** The file in front of the editor, and who has it. */
export type Open = {
  file?: FileKey | undefined;
  /** The developer is typing it in, rather than it being shown whole. */
  writing: boolean;
  duration: number;
  /** Changes whenever it should be opened afresh. */
  instance: string;
  /** The visitor opened it. */
  reading: boolean;
};

function TerminalLine({ line }: { line: string }) {
  if (line.startsWith('$ '))
    return (
      <>
        <span className="text-emerald-400">$</span>{' '}
        <span className="text-white/90">{line.slice(2)}</span>
      </>
    );
  const tone = line.startsWith('✓')
    ? 'text-emerald-300'
    : line.startsWith('→')
      ? 'text-sky-300'
      : line.includes(' 403 ')
        ? 'text-amber-300'
        : 'text-white/55';
  return <span className={tone}>{line}</span>;
}

/**
 * The developer's editor, beside the browser: the project's files on the
 * left (animate-ui's Files), the file being written on the right, typed in
 * as the browser shows it land (animate-ui's CodeBlock), the terminal under
 * it compiling, testing and pushing. The tree, git marks and terminal come
 * from the build's timeline, so they keep step with the browser; which file
 * is open comes from the chapter (`open`) — the script's, one the visitor
 * clicked, or the one a client ask changes.
 */
export function LiveBuildEditor({
  t,
  open,
  onOpenPath,
  onOpenFile,
  className,
}: {
  t: Timeline;
  open: Open;
  onOpenPath: (path: string) => void;
  onOpenFile: (file: FileKey) => void;
  className?: string | undefined;
}) {
  const { file, writing, reading } = open;
  const path = file ? FILES[file].path : undefined;
  // Three tabs fit; the open file is always one of them.
  const tabs = [
    ...t.tabs.filter((k) => FILES[k].path !== path),
    ...(file ? [file] : []),
  ].slice(-3);
  const changes = t.status.size;

  return (
    <div
      style={TOKENS}
      className={cn(
        'flex flex-col overflow-hidden rounded-[1.25rem] bg-[#0d1210] text-white/70 shadow-[0_50px_100px_-40px_rgba(2,12,8,0.7)] ring-1 ring-black/40',
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0a0e0c] px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span
          aria-hidden="true"
          className="mx-auto flex min-w-0 items-center gap-2 rounded-md bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/55 ring-1 ring-white/[0.07] sm:px-10"
        >
          <Search className="size-3 shrink-0" />
          <span className="truncate">your-project</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[11.5px] font-medium text-white/80">
          <span className="relative">
            <WorkAvatar
              who={reading ? 'client' : 'engineer'}
              className="size-6 ring-[#0a0e0c]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0e0c]" />
          </span>
          <span className="hidden sm:inline">
            {reading
              ? 'You · reading'
              : writing
                ? 'Developer · typing'
                : 'Developer'}
          </span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          aria-hidden="true"
          className="hidden w-12 shrink-0 flex-col items-center gap-5 border-r border-white/[0.06] bg-[#0a0e0c] py-4 text-white/35 2xl:flex"
        >
          <span className="relative text-white/85 before:absolute before:-left-[0.95rem] before:inset-y-0 before:w-0.5 before:bg-emerald-400">
            <FilesIcon className="size-5" />
          </span>
          <Search className="size-5" />
          <span className="relative">
            <GitBranch className="size-5" />
            {changes ? (
              <span className="absolute -bottom-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-emerald-950">
                {changes}
              </span>
            ) : null}
          </span>
          <Bug className="size-5" />
          <Blocks className="size-5" />
          <span className="mt-auto grid gap-5">
            <CircleUser className="size-5" />
            <Settings className="size-5" />
          </span>
        </div>

        <nav
          aria-label="Project files"
          className="hidden w-[11rem] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b100e] xl:flex"
        >
          <p
            aria-hidden="true"
            className="flex items-center justify-between px-4 pb-1.5 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40"
          >
            Explorer
            <Ellipsis className="size-3.5" />
          </p>
          <p
            aria-hidden="true"
            className="px-4 pb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/65"
          >
            your-project
          </p>
          <LiveBuildExplorer
            open={t.open}
            active={path}
            status={t.status}
            onOpen={onOpenPath}
          />
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            role="tablist"
            aria-label="Open files"
            className="flex h-9 shrink-0 overflow-hidden border-b border-white/[0.06] bg-[#0a0e0c]"
          >
            {tabs.map((key) => {
              const active = key === file;
              const name = fileName(key);
              const Glyph = glyphFor(name);
              return (
                <button
                  key={FILES[key].path}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onOpenFile(key)}
                  className={cn(
                    'relative flex shrink-0 cursor-pointer items-center gap-2 border-r border-white/[0.06] pl-3.5 pr-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-400',
                    active
                      ? 'bg-[#0d1210] text-white'
                      : 'text-white/45 hover:text-white/80',
                  )}
                >
                  {active ? (
                    <span className="absolute inset-x-0 top-0 h-px bg-emerald-400" />
                  ) : null}
                  <Glyph className="size-3.5" />
                  {name}
                  <span className="grid size-4 place-items-center">
                    {active && writing ? (
                      <span className="size-2 rounded-full bg-white/70" />
                    ) : active ? (
                      <X className="size-3 text-white/45" aria-hidden />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            aria-hidden="true"
            className="flex h-7 shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap px-4 text-[11px] text-white/40"
          >
            your-project
            {path?.split('/').map((part, i, all) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3" />
                <span className={i === all.length - 1 ? 'text-white/75' : undefined}>
                  {part}
                </span>
              </span>
            ))}
          </p>

          {file ? (
            <LiveBuildTyping
              key={open.instance}
              file={file}
              writing={writing}
              duration={open.duration}
            />
          ) : (
            <div className="flex-1" />
          )}

          <div className="h-[8.25rem] shrink-0 border-t border-white/[0.08] bg-[#0a0e0c]">
            <div
              aria-hidden="true"
              className="flex items-center gap-4 px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em]"
            >
              <span className="text-white/30">Problems</span>
              <span className="text-white/30">Output</span>
              <span className="border-b border-emerald-400 pb-1 text-white/85">
                Terminal
              </span>
              <span className="ml-auto hidden font-mono font-normal normal-case tracking-normal text-white/30 sm:inline">
                zsh · your-project
              </span>
            </div>
            <ol
              aria-label="Terminal"
              className="mt-2 space-y-0.5 overflow-hidden whitespace-nowrap px-4 font-mono text-[11px] leading-[1.55]"
            >
              {t.term.slice(-4).map((line, i, lines) => (
                <li
                  key={t.termStart + t.term.length - lines.length + i}
                  className="build-log overflow-hidden text-ellipsis whitespace-pre"
                >
                  <TerminalLine line={line} />
                </li>
              ))}
              <li aria-hidden="true">
                <span className="text-emerald-400">$</span>{' '}
                <span className="build-caret text-white/70" />
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="flex h-6 shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap bg-emerald-700 px-3 text-[10.5px] font-medium text-white/90"
      >
        <span className="flex items-center gap-1">
          <GitBranch className="size-3" />
          main{changes ? '*' : ''}
        </span>
        <span className="flex items-center gap-1">
          <CircleX className="size-3" />0
          <TriangleAlert className="ml-1 size-3" />0
        </span>
        <span className="ml-auto hidden sm:inline">Spaces: 2</span>
        <span className="hidden sm:inline">UTF-8</span>
        {file ? <span>{LANGUAGE[FILES[file].lang]}</span> : null}
        <span className="flex items-center gap-1.5">
          <span className="live-dot size-1.5 rounded-full bg-white" />
          Preview live
        </span>
      </div>
    </div>
  );
}

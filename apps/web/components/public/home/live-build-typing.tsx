'use client';

import { memo, useCallback, useRef, useState } from 'react';

import { CodeBlock } from '@/components/animate-ui/primitives/animate/code-block';
import { FILES, type FileKey } from '@/lib/home/live-build-code';

/** Stable, so CodeBlock does not re-highlight on every render. */
const THEMES = { light: 'vitesse-dark', dark: 'vitesse-dark' };

/** Line numbers; only re-rendered when a line is added or the caret moves to another. */
const Gutter = memo(function Gutter({
  lines,
  current,
}: {
  lines: number;
  current: number;
}) {
  return (
    <ol
      aria-hidden="true"
      className="sticky left-0 w-11 shrink-0 select-none bg-[#0d1210] pr-4 text-right tabular-nums text-white/20"
    >
      {Array.from({ length: lines }, (_, i) => (
        <li key={i} className={i === current ? 'text-white/65' : undefined}>
          {i + 1}
        </li>
      ))}
    </ol>
  );
});

/**
 * One file in the editor: typed in by the developer (animate-ui's CodeBlock),
 * or, when the visitor opens it, shown whole. The line numbers grow with it,
 * and the developer's caret — a name flag, as in a shared editor — sits at
 * the end of what is typed, its flag over the part of the line still to
 * come. Mounted once per file, so `writing` is read once.
 */
export function LiveBuildTyping({
  file,
  writing,
  duration,
}: {
  file: FileKey;
  writing: boolean;
  duration: number;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const { code, lang } = FILES[file];
  const [typing] = useState(writing);
  const [at, setAt] = useState(typing ? 0 : code.length);
  const onWrite = useCallback(
    ({ index }: { index: number }) => setAt(index),
    [],
  );

  const typed = code.slice(0, at);
  const line = typed.split('\n').length - 1;
  const col = typed.length - typed.lastIndexOf('\n') - 1;
  const done = at >= code.length;
  const lines = typing && !done ? line + 1 : code.split('\n').length;

  return (
    <div ref={scroll} className="editor-scroll min-h-0 flex-1 overflow-auto">
      <div className="flex min-w-max py-5 font-mono text-[11.5px] leading-[1.75] xl:text-[12px]">
        <Gutter lines={lines} current={typing && !done ? line : -1} />
        <div className="relative pr-6">
          <CodeBlock
            code={code}
            lang={lang}
            theme="dark"
            themes={THEMES}
            writing={typing}
            duration={duration}
            onWrite={onWrite}
            scrollContainerRef={scroll}
            className="editor-code"
          />
          {typing && !done ? (
            <span
              aria-hidden="true"
              className="editor-caret pointer-events-none absolute left-0 top-0"
              style={{ transform: `translate(${col}ch, ${line * 1.75}em)` }}
            >
              <span className="block h-[1.75em] w-0.5 rounded-full bg-emerald-400" />
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-[5px] bg-emerald-400 px-1.5 py-0.5 font-sans text-[9.5px] font-bold leading-none text-emerald-950 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.6)]">
                Developer
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

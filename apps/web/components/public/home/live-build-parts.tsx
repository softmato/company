'use client';

import Image from 'next/image';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';
import type { Region, Scene } from '@/lib/home/live-build';
import type { Tweak } from '@/lib/home/live-build-asks';
import { fileName, REGION_FILE } from '@/lib/home/live-build-code';
import { useMotionEnabled } from '@/lib/motion/use-motion-enabled';

export type BuildState = {
  /** True once the script has reached `scene`. */
  at: (scene: Scene) => boolean;
  /** Regions outlined as being edited right now. */
  editing: readonly Region[];
  /** Changes the visitor has asked for, as the client. */
  tweaks: ReadonlySet<Tweak>;
};

export const BuildContext = createContext<BuildState>({
  at: () => true,
  editing: [],
  tweaks: new Set(),
});

export const useBuild = () => useContext(BuildContext);

/**
 * Types `text` out once `on` turns true — a word at a time, or a letter at a
 * time for short labels. Reserves the finished text's space so nothing below
 * it jumps while it types. With reduced motion it is simply there.
 */
export function Typed({
  text,
  on,
  by = 'word',
  delay = 0,
  className,
}: {
  text: string;
  on: boolean;
  by?: 'word' | 'char';
  delay?: number;
  /** Classes for the visible text, e.g. a gradient clipped to it. */
  className?: string;
}) {
  const motion = useMotionEnabled();
  const parts = by === 'word' ? text.split(/(?<=\s)/) : [...text];
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!on || !motion) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      id = setInterval(
        () => setN((v) => Math.min(v + 1, parts.length)),
        by === 'word' ? 120 : 40,
      );
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [on, motion, by, delay, parts.length]);

  const shown = !motion ? parts.length : on ? n : 0;

  return (
    <span className="relative inline-block">
      <span className="invisible">{text}</span>
      <span className={cn('absolute inset-0', className)}>
        {parts.slice(0, shown).join('')}
        {on && motion && shown < parts.length ? (
          <span className="build-caret" />
        ) : null}
      </span>
    </span>
  );
}

/**
 * One region of the drawn site: fades in when built, carries a dashed outline
 * and an "Editing" tag while the developer is on it. `data-region` is what the
 * browser scrolls to, the cursor aims at and a click opens in the editor; in
 * the browser (`.build-inspect`) it outlines under the pointer, as dev tools
 * do, naming the file it comes from.
 */
export function Block({
  region,
  shown,
  className,
  children,
}: {
  region: Region;
  shown: boolean;
  className?: string;
  children: ReactNode;
}) {
  const editing = useBuild().editing.includes(region);
  const file = fileName(REGION_FILE[region]);

  return (
    <div
      data-region={region}
      data-editing={editing || undefined}
      className={cn(
        'relative transition-[opacity,translate] duration-700',
        shown ? 'opacity-100' : 'translate-y-3 opacity-0',
        className,
      )}
    >
      {children}
      <span
        className={cn(
          'pointer-events-none absolute inset-1.5 z-10 rounded-xl border-2 border-dashed border-emerald-500/90 transition-opacity duration-300',
          editing ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow">
          editing · {file}
        </span>
      </span>
      <span className="region-inspect pointer-events-none absolute inset-1.5 z-10 rounded-xl border-2 border-sky-400 bg-sky-400/[0.06] opacity-0 transition-opacity duration-200">
        <span className="absolute -top-3 right-4 rounded-full bg-sky-500 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow">
          {file} · open in editor
        </span>
      </span>
    </div>
  );
}

export function Photo({
  src,
  sizes = '(min-width: 1024px) 480px, 80vw',
  className,
}: {
  src: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      className={cn('object-cover transition-opacity duration-700', className)}
    />
  );
}

/** Children arrive one after another once `on` is true. */
export function Pop({
  on,
  index = 0,
  as: Tag = 'div',
  className,
  children,
}: {
  on: boolean;
  index?: number;
  as?: 'div' | 'li';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        'transition-[opacity,scale,translate] duration-500 ease-out',
        on ? 'scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
        className,
      )}
      style={{ transitionDelay: on ? `${index * 160}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}

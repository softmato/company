'use client';

import { PillPile } from '@/components/motion/pill-pile';
import { QUALITIES } from '@/lib/home/qualities';

const TONE_CLASS = {
  solid: 'pill-tag-solid',
  ink: 'pill-tag-ink',
  quiet: 'pill-tag-quiet',
} as const;

/**
 * Fourteen words dropped into a heap.
 *
 * Each pill ships at its resting position — `--pill-x/y/r` from
 * `lib/home/qualities.ts` — and `PillPile` takes over from there once it is in
 * view. That ordering is the whole reason this is safe to put on a marketing
 * page: with no bundle, a failed bundle, or `prefers-reduced-motion`, the
 * reader gets the same heap, already settled, and nothing about the section is
 * missing.
 *
 * The pile is a `<ul>`. Fourteen absolutely positioned spans are a picture; a
 * list is fourteen things, which is what it is.
 */
export function QualityPile() {
  return (
    /*
      Narrower than the section. The pile has to be tall enough and tight
      enough for the words to land on top of one another; given the full
      measure they settle in one flat row and read as a list again.
    */
    <PillPile height={440} className="mx-auto max-w-3xl">
      <ul>
        {QUALITIES.map((quality) => (
          <li
            key={quality.label}
            data-pill=""
            className={`pill-tag ${TONE_CLASS[quality.tone]}`}
            style={
              {
                '--pill-x': `${quality.x}%`,
                '--pill-y': `${quality.y}%`,
                '--pill-r': `${quality.r}deg`,
              } as React.CSSProperties
            }
          >
            {quality.label}
          </li>
        ))}
      </ul>
    </PillPile>
  );
}

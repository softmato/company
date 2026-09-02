import { cn } from '@/lib/cn';

/**
 * Hand-drawn marks: the annotation strokes and margin doodles the reference
 * film scribbles over its headlines.
 *
 * They are here as one small module rather than as five files because they are
 * one idea — a set of paths that share a stroke weight, a cap style and a
 * colour convention — and splitting an idea across five files costs a reader
 * five opens to answer "do these match".
 *
 * Two conventions hold for all of them:
 *
 *   - **`currentColor`, never a literal.** The film's marks are magenta,
 *     yellow and electric blue because that is its brand. Ours take the colour
 *     of wherever they are used, which in practice is `--glow` on a dark band
 *     and `--primary` on a light one.
 *   - **`aria-hidden`.** A mark is emphasis, and emphasis a screen reader
 *     announces as "image" is noise. Where a mark carries meaning the meaning
 *     is in the text under it.
 *
 * Wrap any of these in `DrawIn` to have it drawn on rather than simply appear.
 */
interface MarkProps {
  className?: string | undefined;
  strokeWidth?: number;
}

/**
 * A scribbled double underline, for the one word in a headline that carries it.
 * Sits under the text as an absolutely positioned overlay; the two passes are
 * deliberately not parallel, which is the whole difference between a drawn
 * underline and a border-bottom.
 */
export function MarkUnderline({ className, strokeWidth = 3 }: MarkProps) {
  return (
    <svg
      viewBox="0 0 200 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('absolute inset-x-0 -bottom-1 h-3 w-full', className)}
    >
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M4 12 C 52 4, 118 6, 196 9"
      />
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth - 1}
        d="M10 17 C 64 11, 132 14, 192 15"
      />
    </svg>
  );
}

/**
 * An ellipse circled around a word, drawn as one open loop that overshoots
 * where it started. A closed ellipse reads as a shape; the overshoot is what
 * reads as a pen.
 */
export function MarkCircle({ className, strokeWidth = 3 }: MarkProps) {
  return (
    <svg
      viewBox="0 0 220 74"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn(
        'absolute -inset-x-4 -inset-y-2 size-auto h-[calc(100%+1rem)] w-[calc(100%+2rem)]',
        className,
      )}
    >
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M150 8 C 60 -2, 4 14, 8 38 C 12 62, 96 72, 158 66 C 210 61, 222 40, 206 26 C 196 17, 176 11, 150 10"
      />
    </svg>
  );
}

/**
 * Three short strokes — the film's sparkle, set beside a heading. The smallest
 * mark in the set and the one used most, because it is the only one that adds
 * nothing to read.
 */
export function MarkSpark({ className, strokeWidth = 2.5 }: MarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn('size-8', className)}
    >
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M20 4 L20 14"
      />
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M6 14 L13 20"
      />
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M34 15 L26 20"
      />
    </svg>
  );
}

/**
 * A loose spiral for the margins — the film keeps one in the empty half of its
 * testimonial page, at a very low opacity, purely so the whitespace is not
 * blank. Used at most once per page.
 */
export function MarkSquiggle({ className, strokeWidth = 1.5 }: MarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn('size-28', className)}
    >
      <path
        className="mark-stroke"
        strokeWidth={strokeWidth}
        d="M12 104 C 40 96, 58 78, 52 58 C 48 43, 28 42, 26 57 C 24 74, 46 84, 68 78 C 92 71, 108 48, 98 30 C 90 16, 68 18, 66 32"
      />
    </svg>
  );
}

/**
 * The ringed arrow that follows the film's text links. Not a mark in the
 * hand-drawn sense — it is geometric, and it is here because it belongs to the
 * same set of things a link is decorated with.
 */
export function MarkArrow({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 26 26"
      aria-hidden="true"
      className={cn('size-6', className)}
    >
      <circle
        className="mark-stroke"
        strokeWidth={1.4}
        cx="13"
        cy="13"
        r="12"
      />
      <path className="mark-stroke" strokeWidth={1.4} d="M8.5 13 H17" />
      <path
        className="mark-stroke"
        strokeWidth={1.4}
        d="M13.6 9.4 L17.2 13 L13.6 16.6"
      />
    </svg>
  );
}

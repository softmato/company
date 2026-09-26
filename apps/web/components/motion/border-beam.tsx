import { cn } from '@/lib/cn';

/**
 * A short light that runs around its parent's border.
 *
 * Magic UI's `border-beam`, as its original CSS rather than the current
 * `motion` version: UI_BRIEF §6 rules out a second animation library, and the
 * `motion` port only animates `offset-distance`, which CSS does on its own.
 * The beam is a small gradient square riding `offset-path` around a
 * rounded rect; a two-layer mask keeps only the part over the border.
 *
 * The parent needs `position: relative` and a border radius (inherited). The
 * beam only runs while an ancestor carries `data-inview` — see
 * `.border-beam` in `marketing.css` — and not at all under reduced motion.
 */
export function BorderBeam({
  className,
  size = 120,
  duration = 9,
  delay = 0,
  borderWidth = 1.5,
  colorFrom = 'var(--glow)',
  colorTo = 'var(--primary)',
}: {
  className?: string | undefined;
  /** Length of the beam, px. */
  size?: number;
  /** Seconds per lap. */
  duration?: number;
  /** Seconds; negative starts it part-way round. */
  delay?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('border-beam', className)}
      style={
        {
          '--beam-size': `${size}px`,
          '--beam-duration': `${duration}s`,
          '--beam-delay': `${delay}s`,
          '--beam-width': `${borderWidth}px`,
          '--beam-from': colorFrom,
          '--beam-to': colorTo,
        } as React.CSSProperties
      }
    />
  );
}

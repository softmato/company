import { cn } from '@/lib/cn';

/**
 * The wordmark. The two `o`s sway ±4° on a 3s loop
 * (docs/handoff/UI_HANDOFF.md §6) — the only decorative motion in the system,
 * and it stops dead under `prefers-reduced-motion`.
 *
 * The letters are split for animation, so the whole word is wrapped in one
 * `aria-label` and the pieces hidden. Without that, a screen reader reads
 * "s o f t m a t o" one letter at a time. `role="img"` is what makes that
 * label legal — ARIA forbids `aria-label` on a bare `span`, and without a role
 * the label is ignored, which is the letter-by-letter reading again.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Softmato"
      className={cn(
        'headline inline-flex items-baseline text-[19px]',
        className,
      )}
    >
      <span aria-hidden="true">s</span>
      <span aria-hidden="true" className="inline-block animate-sway">
        o
      </span>
      <span aria-hidden="true">ftmat</span>
      <span
        aria-hidden="true"
        className="inline-block animate-sway [animation-delay:-1.5s]"
      >
        o
      </span>
    </span>
  );
}

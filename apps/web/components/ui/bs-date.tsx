import { formatAd, formatBs, formatBsNumeric } from '@/lib/format/date';
import { cn } from '@/lib/cn';

/**
 * A date on screen. **BS primary, AD secondary** (docs/DESIGN.md §5).
 *
 * The `<time>` element carries the machine-readable ISO value, which is the
 * only representation here a crawler or an assistive technology can parse —
 * neither reads Bikram Sambat.
 *
 *   short    12 Bhadra 2082
 *   full     12 Bhadra 2082 (28 Aug 2026) — where precision matters
 *   numeric  2082/05/12 — dense tables
 */
export function BsDate({
  date,
  format = 'short',
  className,
}: {
  date: Date;
  format?: 'short' | 'full' | 'numeric';
  className?: string;
}) {
  const text =
    format === 'numeric'
      ? formatBsNumeric(date)
      : format === 'full'
        ? `${formatBs(date)} (${formatAd(date)})`
        : formatBs(date);

  return (
    <time
      dateTime={date.toISOString()}
      className={cn(
        format === 'numeric' && 'font-mono tabular-nums',
        className,
      )}
    >
      {text}
    </time>
  );
}

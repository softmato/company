import { cn } from '@/lib/cn';

/**
 * Status badge (docs/handoff/UI_HANDOFF.md §4).
 *
 * The vocabulary is fixed, and it maps state to colour by *meaning* rather
 * than by mood:
 *
 *   credit   succeeded, active, reconciled, paid — the money is ours
 *   neutral  pending, created, polling — nobody has to do anything yet
 *   quiet    failed, cancelled, expired — over, and no money moved
 *   flag     refunded, reversed, mismatch — money went back or does not agree
 *
 * `failed` is deliberately quiet rather than red. A failed payment is the
 * customer's card being declined; it did not move our money, and colouring it
 * the same as a reversal would put two very different events in one bucket.
 */
export type BadgeTone = 'credit' | 'neutral' | 'quiet' | 'flag' | 'primary';

const TONES: Record<BadgeTone, string> = {
  credit: 'bg-credit/10 text-credit',
  neutral: 'bg-muted text-foreground',
  quiet: 'bg-muted text-muted-foreground',
  flag: 'bg-flag/10 text-flag',
  primary: 'bg-primary/10 text-primary',
};

const STATUS_TONES: Record<string, BadgeTone> = {
  succeeded: 'credit',
  active: 'credit',
  reconciled: 'credit',
  paid: 'credit',
  approved: 'credit',
  published: 'primary',
  pending: 'neutral',
  created: 'neutral',
  polling: 'neutral',
  draft: 'quiet',
  failed: 'quiet',
  cancelled: 'quiet',
  expired: 'quiet',
  refunded: 'flag',
  reversed: 'flag',
  mismatch: 'flag',
  overdue: 'flag',
};

/** Falls back to neutral rather than throwing — an unknown state still has to render. */
export function toneForStatus(status: string): BadgeTone {
  return STATUS_TONES[status.toLowerCase()] ?? 'neutral';
}

export function Badge({
  tone,
  status,
  children,
  className,
}: {
  tone?: BadgeTone;
  status?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const resolved = tone ?? (status ? toneForStatus(status) : 'neutral');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5',
        'text-xs font-medium',
        TONES[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}

import { cn } from '@/lib/cn';

/**
 * The pending indicator. Checkout gets this and no other motion
 * (docs/handoff/UI_HANDOFF.md §6).
 *
 * `aria-hidden` because the spinner is decoration: the state it reports
 * belongs in the button's own label ("Checking…"), which is what a screen
 * reader announces. A spinning graphic announces nothing.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('size-4 animate-spin', className)}
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The pending dot, for a row that is waiting on someone else — a payment
 * being polled, an approval in the queue.
 */
export function PendingDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-1.5 rounded-full bg-current animate-pulse',
        className,
      )}
    />
  );
}

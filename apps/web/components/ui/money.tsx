import { formatNpr, formatPaisa } from '@/lib/format/money';
import { cn } from '@/lib/cn';

/**
 * An amount on screen.
 *
 * `tone` is the only way an amount gets a colour, and the colour is a claim
 * about the money, never emphasis:
 *
 *   credit  money in
 *   flag    money out, reversed, overdue
 *   plain   everything else — a price, a subtotal, a limit
 *
 * `sign` is separate from `tone` because they answer different questions. A
 * refund of 3,000 is money out (flag) and shows as −3,000.00; a plan that
 * costs 3,000 is neither, and showing it in red would say something untrue
 * about the company's books.
 */
export function Money({
  minor,
  tone = 'plain',
  unit,
  className,
}: {
  minor: bigint;
  tone?: 'plain' | 'credit' | 'flag';
  unit?: boolean;
  className?: string;
}) {
  const text = unit ? formatNpr(minor) : formatPaisa(minor);

  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        tone === 'credit' && 'text-credit',
        tone === 'flag' && 'text-flag',
        className,
      )}
    >
      {text}
    </span>
  );
}

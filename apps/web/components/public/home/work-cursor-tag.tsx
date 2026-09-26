import { cn } from '@/lib/cn';

import { WorkAvatar } from './work-avatar';

/**
 * A live-cursor name tag, as in a shared design file: the two people working
 * on the same change, both visibly present. A name and a face, nothing else.
 * It wanders on a slow loop of its own (`.cursor-wander`), so the two tags
 * never move in step.
 */
export function WorkCursorTag({
  who,
  side,
  period,
}: {
  who: 'client' | 'engineer';
  /** Which side of the avatar the name sits on; the pointer is opposite. */
  side: 'left' | 'right';
  /** Seconds per wander loop. */
  period: number;
}) {
  return (
    <div
      className={cn(
        'cursor-wander flex items-center gap-2',
        side === 'right' && 'flex-row-reverse',
      )}
      style={{ '--wander': `${period}s` } as React.CSSProperties}
    >
      <span
        className={cn(
          'rounded-lg px-3 py-1.5 text-[13px] font-medium shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)]',
          who === 'engineer'
            ? 'bg-primary text-primary-foreground'
            : 'bg-foreground text-background',
        )}
      >
        {who === 'client' ? 'You' : 'Engineer'}
      </span>

      <span className="relative">
        <WorkAvatar who={who} className="size-11" />
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={cn(
            'absolute -top-2.5 size-4',
            who === 'engineer' ? 'fill-primary' : 'fill-foreground',
            side === 'right' ? '-left-2.5 -scale-x-100' : '-right-2.5',
          )}
        >
          <path d="M15 1 1 6.5l5.6 2 2 5.6z" />
        </svg>
      </span>
    </div>
  );
}

import { cn } from '@/lib/cn';

/**
 * A compact progress bar with one segment per stage — the card-sized version
 * of `StageTrack`. Segments rather than a percentage, because "3 of 5 stages"
 * is what a client can check against the plan; 60% is not.
 */
export function StageProgress({
  total,
  done,
  className,
}: {
  total: number;
  done: number;
  className?: string;
}) {
  if (total === 0) return null;

  return (
    <div
      role="img"
      aria-label={`${done} of ${total} stages done`}
      className={cn('flex gap-1', className)}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 flex-1 rounded-full',
            i < done
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : i === done
                ? 'bg-emerald-300/60 motion-safe:animate-pulse'
                : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

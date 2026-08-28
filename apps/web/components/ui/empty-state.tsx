import { cn } from '@/lib/cn';

/**
 * What a list looks like when there is nothing in it.
 *
 * An empty queue describes what *will* appear here and offers the action that
 * fills it (docs/handoff/UI_HANDOFF.md §8). "No results" tells someone the
 * screen is working and nothing else; it reads like a fault when it is
 * usually good news.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      <p className="headline text-[15px]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

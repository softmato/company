import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';

/**
 * A single figure with its label and a line of context.
 *
 * The dashboard's top row answers "is anything wrong?" before it answers "how
 * are we doing?" (docs/UI_BRIEF.md §3.2), so `alert` exists to let one tile
 * say so. It tints the border and the figure — not the whole tile, because a
 * filled red panel reads as an error state for the page rather than a number
 * that needs a look.
 */
export function StatTile({
  label,
  value,
  note,
  alert,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  alert?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('px-5 py-4', alert && 'border-flag/40', className)}>
      <p className="eyebrow">{label}</p>

      <p
        className={cn(
          'mt-2 font-mono text-[28px] leading-none tabular-nums',
          alert && 'text-flag',
        )}
      >
        {value}
      </p>

      {note ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{note}</p>
      ) : null}
    </Card>
  );
}

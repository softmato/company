import { cn } from '@/lib/cn';

/**
 * The banded table — the one signature move (docs/handoff/UI_HANDOFF.md §5).
 *
 * Three things here are requirements, not styling:
 *
 *   1. **Real `<table>` markup.** A grid of divs loses the row/column
 *      relationship, and a screen reader reading a ledger without it reads a
 *      list of unattached numbers.
 *   2. **Banding is structural.** Even rows carry `--muted` always, never on
 *      hover. A founder tracing a figure across eight columns on a touchscreen
 *      has no hover to give. Banding and row borders are mutually exclusive —
 *      pick the band.
 *   3. **Numeric columns are right-aligned tabular mono**, header included, so
 *      a figure with the wrong number of zeros is visibly the wrong width.
 */
export function DataTable({
  className,
  dense,
  children,
  ...props
}: React.ComponentProps<'table'> & { dense?: boolean }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        data-dense={dense || undefined}
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  numeric,
  className,
  ...props
}: React.ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border px-3 pb-2 text-left align-bottom font-normal',
        'font-mono text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('h-11 even:bg-muted [table[data-dense]_&]:h-10', className)}
      {...props}
    />
  );
}

export function Td({
  numeric,
  className,
  ...props
}: React.ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'px-3 align-middle',
        numeric && 'text-right font-mono tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A totals row. Ruled off above rather than banded, because a total is not
 * another row of the same kind — it is the row the others add up to.
 */
export function TotalRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('h-11 border-t-2 border-border font-medium', className)}
      {...props}
    />
  );
}

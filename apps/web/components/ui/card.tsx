import { cn } from '@/lib/cn';

/**
 * A panel on the page ground: hairline border, 14px radius, and a shadow you
 * have to look for (docs/handoff/UI_HANDOFF.md §4). Depth comes from the
 * hairline; the shadow only stops the card sitting flat on white.
 */
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-5 py-3.5',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('headline text-[16px] leading-tight', className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

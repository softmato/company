import { cn } from '@/lib/cn';

/**
 * Label, control, help and error, wired together.
 *
 * The wiring is the point. `aria-describedby` has to name whichever of help
 * and error actually rendered, or a screen reader announces a field with a
 * problem and no statement of what the problem is.
 *
 * Error copy names the fix, not the failure — "Enter a complete email
 * address", never "Invalid email" (docs/handoff/UI_HANDOFF.md §8).
 */
export function Field({
  id,
  label,
  help,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  children: (props: {
    id: string;
    invalid: boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
  className?: string;
}) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-muted-foreground" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        invalid: Boolean(error),
        'aria-describedby': describedBy,
      })}

      {error ? (
        <p id={errorId} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {help ? (
        <p id={helpId} className="text-[13px] text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

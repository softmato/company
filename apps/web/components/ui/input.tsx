import { cn } from '@/lib/cn';

/**
 * Text input and textarea (docs/handoff/UI_HANDOFF.md §4).
 *
 * `invalid` draws the destructive border. It is a prop rather than a CSS
 * `:invalid` selector because our validation is server-side — the browser's
 * idea of valid and ours disagree, and the server's is the one that decided.
 *
 * There is no placeholder-as-label variant on purpose: a placeholder vanishes
 * the moment someone types, and a form you cannot re-read is a form people
 * get wrong.
 */
const FIELD_BASE =
  'w-full rounded-md border bg-background px-3 text-sm shadow-xs ' +
  'placeholder:text-muted-foreground/70 ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function borderFor(invalid?: boolean) {
  return invalid
    ? 'border-destructive focus-visible:ring-destructive/40'
    : 'border-input focus-visible:border-primary';
}

export function Input({
  className,
  invalid,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, 'h-9', borderFor(invalid), className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  rows = 5,
  ...props
}: React.ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        'py-2 leading-relaxed',
        borderFor(invalid),
        className,
      )}
      {...props}
    />
  );
}

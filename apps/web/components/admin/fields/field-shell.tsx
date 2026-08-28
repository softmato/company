/**
 * Label, hint and error around any input.
 *
 * The label is always visible — never placeholder-as-label (docs/DESIGN.md §8).
 * The error names the problem rather than saying the value is invalid.
 */
export function FieldShell({
  name,
  label,
  hint,
  error,
  required,
  children,
}: {
  name: string;
  label: string;
  // `| undefined` is required by exactOptionalPropertyTypes: these are passed
  // through from optional FieldSpec properties, which may genuinely be absent.
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="mt-5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? (
          <span className="text-muted-foreground" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      {hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shared input styling, so every field looks and focuses the same.
 *
 * Matches `components/ui/input.tsx` — the admin field specs predate that
 * primitive and drive their inputs from a spec object rather than JSX, so
 * they carry the class instead of the component. Change both together.
 */
export const inputClass =
  'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs ' +
  'placeholder:text-muted-foreground/70 ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Describes an input by its hint and error, for screen readers. */
export function describedBy(
  name: string,
  hint?: string,
  error?: string,
): string | undefined {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null]
    .filter(Boolean)
    .join(' ');

  return ids || undefined;
}

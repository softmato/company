/**
 * The before/after pair for one audit entry.
 *
 * Rendered as two key/value lists rather than raw JSON: the brief asks for
 * diffs "readable without a JSON viewer" (docs/UI_BRIEF.md §3.2), and a
 * founder checking what changed on a refund should not have to parse braces
 * to find out.
 *
 * Only keys that actually differ are shown. An unchanged field in a
 * before/after snapshot is noise, and there are a lot of them — the snapshots
 * are whole-row and indiscriminate by design.
 */
function changedKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  return [...keys]
    .filter((key) => display(before?.[key]) !== display(after?.[key]))
    .sort();
}

function display(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;

  return JSON.stringify(value);
}

export function AuditDetail({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = changedKeys(before, after);

  if (keys.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No field-level change was recorded for this entry.
      </p>
    );
  }

  return (
    <dl className="grid gap-2">
      {keys.map((key) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-3">
          <dt className="font-mono text-[12px] text-muted-foreground">{key}</dt>
          <dd className="flex flex-wrap items-baseline gap-2 text-[13px]">
            <span className="break-all font-mono text-muted-foreground line-through">
              {truncate(display(before?.[key]))}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              →
            </span>
            <span className="break-all font-mono">
              {truncate(display(after?.[key]))}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A markdown body in an after-state can be thousands of characters long. */
function truncate(value: string, max = 160): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

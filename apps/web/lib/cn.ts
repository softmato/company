/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately not `clsx` + `tailwind-merge`: docs/UI_BRIEF.md §6 forbids new
 * dependencies without asking, and conflict resolution is not needed here —
 * every component below composes its own classes and takes an optional
 * `className` last, so the caller's class already wins by source order.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

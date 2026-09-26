/**
 * `date` columns arrive as `YYYY-MM-DD` strings. Pinned to midday in
 * Kathmandu so no timezone shift can move a due date onto the day before.
 */
export function dayDate(value: string): Date {
  return new Date(`${value}T12:00:00+05:45`);
}

/** Whole days from today (Kathmandu) to `value`; negative when past. */
export function daysUntil(value: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
  }).format(now);

  return Math.round(
    (dayDate(value).getTime() - dayDate(today).getTime()) / 86_400_000,
  );
}

/** `in 3 days`, `today`, `2 days late`. */
export function relativeDue(value: string, now = new Date()): string {
  const days = daysUntil(value, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return '1 day late';
  return `${-days} days late`;
}

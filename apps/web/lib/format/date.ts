import NepaliDate from 'nepali-date-converter';

/**
 * Date display. **BS primary, AD secondary** (docs/DESIGN.md §5).
 *
 * Conversion happens here, at render, never at write. Stored values stay UTC.
 * This is the opposite of the fiscal period rule in
 * packages/db/seed/fiscal-periods.ts, and deliberately so: a display string can
 * be recomputed if a library changes, a period boundary under posted history
 * cannot.
 */

const BS_MONTHS = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

/** `12 Bhadra 2082`. */
export function formatBs(date: Date): string {
  const bs = new NepaliDate(date);
  const month = BS_MONTHS[bs.getMonth()] ?? '';
  return `${bs.getDate()} ${month} ${bs.getYear()}`;
}

/** `28 Aug 2026`. */
export function formatAd(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  }).format(date);
}

/** `12 Bhadra 2082 (28 Aug 2026)` — where precision matters. */
export function formatBsWithAd(date: Date): string {
  return `${formatBs(date)} (${formatAd(date)})`;
}

/** `2082/05/12` — dense tables, set in mono. */
export function formatBsNumeric(date: Date): string {
  const bs = new NepaliDate(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${bs.getYear()}/${pad(bs.getMonth() + 1)}/${pad(bs.getDate())}`;
}

/**
 * `2 Sep 2026, 3:18 pm` — a moment, not just a day.
 *
 * The month is a name rather than a number on purpose. `9/2/2026` is the 2nd
 * of September to a browser set to en-US and the 9th of February to almost
 * everyone else, and a deadline is exactly the wrong place to make a reader
 * guess which one they are looking at.
 */
export function formatAdDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kathmandu',
  })
    .format(date)
    .replace(/\s?([ap])m$/i, (_, meridiem: string) => ` ${meridiem}m`);
}

/**
 * `in about 24 hours` — how long is left, in the words someone would use.
 *
 * Paired with an absolute time rather than replacing it. On its own an
 * absolute time is genuinely hard to read at a glance: a link issued at
 * 3:18 pm and expiring at 3:18 pm tomorrow differs only in a date the eye
 * skips, which reads as "this expired a minute ago" and sends a founder
 * hunting for a bug that is not there.
 *
 * Deliberately vague above an hour. The exact minute of a 24-hour deadline is
 * not a number anyone acts on, and "about" is honest about a value that is
 * already stale by the time it is read.
 */
export function expiresIn(expiresAt: Date, now = new Date()): string {
  const ms = expiresAt.getTime() - now.getTime();

  if (ms <= 0) return 'now — it has expired';

  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) {
    return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `in about ${Math.round(ms / 86_400_000)} days`;
}

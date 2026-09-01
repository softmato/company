/**
 * Pulling booking details out of what a visitor actually typed.
 *
 * The rule this module exists to enforce: **never invent a detail**. The
 * previous implementation took `message.split(' ')[0]` as the client's name,
 * so "book a call, I'm at x@y.com" produced a booking for a client named
 * "Book" and mailed the founders "[NEW BOOKING] Book booked a Discovery
 * Call". It also stamped every booking with a hardcoded `2026-09-02` at
 * `14:00 NPT` regardless of the date requested.
 *
 * Every field here returns `null` when the message does not contain it. A
 * caller holding a `null` must ask the visitor, not guess — a guessed name in
 * a confirmation email is worse than one more question in the chat.
 */

import { normaliseTime, nptDateKey } from './slots';

export interface ParsedBooking {
  name: string | null;
  email: string | null;
  phone: string | null;
  date: string | null;
  time: string | null;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+\w/;

/**
 * Words that show up capitalised mid-sentence but are never a person's name.
 * Without this list "Book", "Monday" and "Softmato" all read as candidates.
 */
const NOT_A_NAME = new Set([
  'book', 'booking', 'meeting', 'call', 'schedule', 'slot', 'discovery',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'today', 'tomorrow', 'softmato', 'hello', 'hey', 'hi', 'thanks', 'please',
  'yes', 'no', 'sure', 'ok', 'okay', 'my', 'the', 'a', 'an', 'i', 'im',
  'email', 'name', 'phone', 'number', 'project', 'team', 'jiwan', 'siddhant',
]);

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export function extractEmail(message: string): string | null {
  return EMAIL_RE.exec(message)?.[0] ?? null;
}

/**
 * A phone number, only when the visitor has clearly written one.
 * Requires 7+ digits so a year or a price is not mistaken for a number.
 */
export function extractPhone(message: string): string | null {
  const match = /(\+?\d[\d\s-]{6,17}\d)/.exec(message.replace(EMAIL_RE, ''));
  if (!match) return null;
  const candidate = match[1] as string;
  const digits = candidate.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return candidate.trim();
}

/**
 * A name, only when the visitor introduced themselves.
 *
 * Recognised patterns are explicit introductions — "I'm Ram Thapa", "my name
 * is Ram", "this is Ram". A bare capitalised word elsewhere in a sentence is
 * not treated as a name: the false-positive rate is what produced "Book".
 */
export function extractName(message: string): string | null {
  const patterns = [
    /\b(?:my name'?s|my name is|name'?s)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*)?)/i,
    /\b(?:i am|i'?m|this is|it'?s)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*)?)/i,
    /\b(?:for|from)\s+([A-Z][a-z'.-]+(?:\s+[A-Z][a-z'.-]+))/,
  ];

  for (const pattern of patterns) {
    const captured = pattern.exec(message)?.[1];
    if (!captured) continue;

    const words = captured
      .trim()
      .split(/\s+/)
      .filter(w => !NOT_A_NAME.has(w.toLowerCase().replace(/[^a-z]/g, '')));

    if (words.length === 0) continue;

    const name = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (name.length < 2) continue;
    return name;
  }

  return null;
}

/** `HH:MM` in 24-hour form, or `null` when no time was given. */
export function extractTime(message: string): string | null {
  const explicit = /\b(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(message);
  if (explicit) {
    const normalised = normaliseTime(explicit[0]);
    return /^\d{2}:\d{2}$/.test(normalised) ? normalised : null;
  }

  const loose = /\b(\d{1,2})\s*(am|pm)\b/i.exec(message);
  if (loose) {
    return normaliseTime(`${loose[1]}:00 ${loose[2]}`);
  }

  return null;
}

/**
 * `YYYY-MM-DD` in Nepal time, or `null`.
 *
 * Handles an explicit ISO date, "tomorrow", a bare weekday ("Tuesday" means
 * the next one, not today), and "12 September" / "September 12".
 */
export function extractDate(message: string, now: Date = new Date()): string | null {
  const lower = message.toLowerCase();
  const nptNow = new Date(now.getTime() + (5 * 60 + 45) * 60_000);

  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(message);
  if (iso) return iso[0] as string;

  if (/\btoday\b/.test(lower)) return nptDateKey(nptNow);
  if (/\btomorrow\b/.test(lower)) {
    return nptDateKey(new Date(nptNow.getTime() + 86_400_000));
  }

  const weekdayIndex = WEEKDAYS.findIndex(d => new RegExp(`\\b${d}\\b`).test(lower));
  if (weekdayIndex >= 0) {
    let delta = (weekdayIndex - nptNow.getUTCDay() + 7) % 7;
    if (delta === 0) delta = 7;
    return nptDateKey(new Date(nptNow.getTime() + delta * 86_400_000));
  }

  const dayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b/i.exec(message);
  const monthFirst = /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(message);

  for (const [dayRaw, monthRaw] of [
    dayFirst ? [dayFirst[1], dayFirst[2]] : null,
    monthFirst ? [monthFirst[2], monthFirst[1]] : null,
  ].filter(Boolean) as Array<[string, string]>) {
    const monthIndex = MONTHS.findIndex(m => m.startsWith(monthRaw.toLowerCase()));
    if (monthIndex < 0) continue;

    const day = Number(dayRaw);
    if (day < 1 || day > 31) continue;

    let year = nptNow.getUTCFullYear();
    // A month already past this year means they mean next year.
    if (monthIndex < nptNow.getUTCMonth()) year += 1;

    return nptDateKey(new Date(Date.UTC(year, monthIndex, day)));
  }

  return null;
}

export function parseBooking(message: string, now: Date = new Date()): ParsedBooking {
  return {
    name: extractName(message),
    email: extractEmail(message),
    phone: extractPhone(message),
    date: extractDate(message, now),
    time: extractTime(message),
  };
}

/**
 * Turning a tool result into something Alex would actually say.
 *
 * Two rules, both learned from what this replaced:
 *
 * 1. **Say only what is true.** The old confirmation ended "A calendar
 *    invitation has been dispatched to your email" — unconditionally, and
 *    with no calendar invitation anywhere in the system. It said it even when
 *    the send had failed. Claims about email now follow the `clientNotified`
 *    flag the tool actually returns.
 *
 * 2. **Sound like the persona.** `system-prompt.ts` promises a colleague on
 *    Slack, then the reply arrived as "🎉 **Meeting Confirmed!**" over a
 *    bulleted field dump. Dates are spoken the way a person in Kathmandu
 *    says them — Bikram Sambat first, Gregorian in the bracket — not as the
 *    raw "2026-09-02 at 14:00 NPT" the store happens to hold.
 */

import { formatBsWithAd } from '@/lib/format/date';
import type { ToolExecutionResult } from './types';

/**
 * A stored `YYYY-MM-DD` as a `Date` fixed at midday Nepal time.
 *
 * Midday, not midnight: `nepali-date-converter` reads the *local* fields of
 * the Date it is given, so a slot pinned to 00:00 UTC lands on the previous
 * BS day for any server running west of UTC. Noon NPT is safely inside the
 * day whatever timezone the process happens to boot in.
 */
function atNptMidday(date: string): Date | null {
  const parsed = new Date(`${date}T06:15:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * `2026-09-02` + `14:00 NPT` -> `Wed 17 Bhadra 2082 (2 Sep 2026), 2:00 pm`.
 *
 * BS primary, AD secondary — the house convention from docs/DESIGN.md §5, and
 * right here for the same reason it is right on an invoice: a Kathmandu
 * client reads Bikram Sambat, an international client reads the Gregorian
 * date in the bracket. A meeting time is precision, so it takes the
 * both-calendars form rather than BS alone.
 */
export function speakSlot(date: string, time: string): string {
  const parsed = atNptMidday(date);
  if (!parsed) return `${date} at ${time}`;

  const weekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: 'Asia/Kathmandu',
  }).format(parsed);

  return `${weekday} ${formatBsWithAd(parsed)}, ${speakTime(time)}`;
}

/** `14:00 NPT` → `2:00 pm`. */
export function speakTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = match[2] as string;
  const meridiem = hour >= 12 ? 'pm' : 'am';
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${display}:${minute} ${meridiem}`;
}

function speakSlots(slots: Array<{ date: string; time: string }>): string {
  if (slots.length === 0) {
    return `looks like we're fully booked for the next couple of weeks — drop me your email and I'll have a founder reach out with more options.`;
  }

  // A wall of thirty slots is not help. Show the next handful.
  const shown = slots.slice(0, 6);
  const lines = shown.map((s) => `• ${speakSlot(s.date, s.time)}`).join('\n');
  const more =
    slots.length > shown.length
      ? `\n\n(there's more open after that if none of these fit)`
      : '';

  return `here's what's open — all times Kathmandu:\n\n${lines}${more}\n\ntell me which one works plus your name and email, and I'll lock it in.`;
}

/** One tool result, phrased for the visitor. */
export function formatToolResult(result: ToolExecutionResult): string {
  if (!result.success) {
    return result.error ?? `that didn't go through — mind trying again?`;
  }

  const data = (result.data ?? {}) as Record<string, unknown>;

  if (
    result.toolName === 'get_available_meeting_slots' &&
    Array.isArray(data.availableSlots)
  ) {
    return speakSlots(
      data.availableSlots as Array<{ date: string; time: string }>,
    );
  }

  if (result.toolName === 'book_meeting' && data.bookingId) {
    const when = speakSlot(String(data.date), String(data.time));
    const confirmation = data.clientNotified
      ? `confirmation's on its way to ${String(data.email)}.`
      : `heads up — I couldn't get the confirmation email out, so hang on to that reference.`;

    return `done! you're booked for **${when}**.\n\nreference \`${String(data.bookingId)}\` — ${confirmation} talk soon!`;
  }

  if (result.toolName === 'create_lead' && data.leadId) {
    return `got it — logged your project under \`${String(data.leadId)}\`. one of us will come back to you within a day with thoughts and a rough shape for it.`;
  }

  if (result.toolName === 'contact_human_team' && data.requestId) {
    return `passed straight to the team — reference \`${String(data.requestId)}\`. someone will email you at ${String(data.email)} directly.`;
  }

  return data.message ? String(data.message) : `all set.`;
}

export function formatToolResults(results: ToolExecutionResult[]): string {
  return results.map(formatToolResult).join('\n\n');
}

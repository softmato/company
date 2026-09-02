/**
 * Discovery-call availability, computed from the clock.
 *
 * This replaces a hardcoded array of eight calendar dates. That array was
 * written in September 2026 and would have gone on offering 2026-09-02 to
 * every visitor forever — quoting dates in the past to prospective clients
 * within a week of being written. Availability is a function of *now*, so it
 * is computed, never stored as a literal.
 *
 * Nepal Standard Time is UTC+05:45. There is no DST, so a fixed offset is
 * correct here and a timezone library would be weight for nothing.
 */

export interface MeetingSlot {
  /** `YYYY-MM-DD`, in Nepal Standard Time. */
  date: string;
  /** `HH:MM NPT`, 24-hour. */
  time: string;
  available: boolean;
}

/** UTC+05:45, in minutes. */
const NPT_OFFSET_MIN = 5 * 60 + 45;

/**
 * Office hours a founder will actually take a call in, Kathmandu local.
 * Deliberately short: two morning and two afternoon options read as a real
 * calendar, where a list of every half-hour reads as a machine guessing.
 */
const DAILY_TIMES = ['10:00', '11:30', '14:00', '15:30'] as const;

/** How far ahead we will offer. Beyond a fortnight is a lead, not a booking. */
const HORIZON_DAYS = 14;

/** Slots inside this many hours from now are not offered — nobody can make them. */
const MIN_NOTICE_HOURS = 12;

/** The clock in Kathmandu, expressed as a UTC `Date` shifted by the offset. */
function nowInNpt(now: Date): Date {
  return new Date(now.getTime() + NPT_OFFSET_MIN * 60_000);
}

/** `YYYY-MM-DD` for an already-NPT-shifted date. */
export function nptDateKey(shifted: Date): string {
  return shifted.toISOString().slice(0, 10);
}

/** The UTC instant a given NPT date and `HH:MM` actually falls on. */
export function nptSlotInstant(date: string, time: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match || !clock) return null;

  const [, y, mo, d] = match as unknown as [string, string, string, string];
  const [, h, mi] = clock as unknown as [string, string, string];

  const asUtc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  );
  if (Number.isNaN(asUtc)) return null;

  return new Date(asUtc - NPT_OFFSET_MIN * 60_000);
}

/**
 * Every slot the team can take over the coming fortnight.
 *
 * Weekends are skipped. Nepal's working week runs Sunday to Friday with
 * Saturday as the single rest day, but discovery calls are with international
 * clients as often as local ones, so Saturday and Sunday are both left out
 * rather than offering a slot nobody on either side will take.
 */
export function generateSlots(now: Date = new Date()): MeetingSlot[] {
  const slots: MeetingSlot[] = [];
  const cutoff = now.getTime() + MIN_NOTICE_HOURS * 3_600_000;
  const today = nowInNpt(now);

  for (let dayOffset = 0; dayOffset <= HORIZON_DAYS; dayOffset += 1) {
    const day = new Date(today.getTime() + dayOffset * 86_400_000);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const date = nptDateKey(day);

    for (const time of DAILY_TIMES) {
      const instant = nptSlotInstant(date, time);
      if (!instant || instant.getTime() < cutoff) continue;
      slots.push({ date, time: `${time} NPT`, available: true });
    }
  }

  return slots;
}

/** Is this a real slot the team offers — not merely a well-formed date? */
export function isOfferedSlot(
  date: string,
  time: string,
  now: Date = new Date(),
): boolean {
  const wanted = normaliseTime(time);
  return generateSlots(now).some(
    (s) => s.date === date && normaliseTime(s.time) === wanted,
  );
}

/** `2:00 pm`, `14:00`, and `14:00 NPT` are the same slot. Compare on `HH:MM`. */
export function normaliseTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(time.trim());
  if (!match) return time.trim().toLowerCase();

  const [, rawHour, minute, meridiem] = match as unknown as [
    string,
    string,
    string,
    string | undefined,
  ];
  let hour = Number(rawHour);

  if (meridiem) {
    const isPm = meridiem.toLowerCase() === 'pm';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

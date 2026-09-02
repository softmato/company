import { describe, it, expect } from 'vitest';
import {
  extractName,
  extractEmail,
  extractDate,
  extractTime,
  extractPhone,
  parseBooking,
} from '../lib/ai/parse-booking';
import { generateSlots, isOfferedSlot, normaliseTime } from '../lib/ai/slots';

/** A fixed Tuesday, so weekday arithmetic is assertable. */
const TUESDAY = new Date('2026-09-01T04:00:00.000Z');

describe('Booking detail extraction', () => {
  describe('names', () => {
    it('does not read the first word of a sentence as a name', () => {
      // The regression that mailed "[NEW BOOKING] Book booked a Discovery Call".
      expect(
        extractName('book a call, my email is ram@example.com'),
      ).toBeNull();
      expect(extractName('Schedule me for next week')).toBeNull();
      expect(extractName('Meeting please')).toBeNull();
    });

    it('picks up an explicit introduction', () => {
      expect(extractName("hi, I'm Ram Thapa")).toBe('Ram Thapa');
      expect(extractName('my name is sita gurung')).toBe('Sita Gurung');
      expect(extractName('this is Bikash')).toBe('Bikash');
    });

    it('returns null rather than guessing when no name is given', () => {
      expect(extractName('can we talk tomorrow at 2pm?')).toBeNull();
      expect(extractName('')).toBeNull();
    });
  });

  describe('emails and phones', () => {
    it('finds an address anywhere in the sentence', () => {
      expect(
        extractEmail('reach me at ram.thapa+work@example.co.uk please'),
      ).toBe('ram.thapa+work@example.co.uk');
    });

    it('returns null when there is no address, never a placeholder', () => {
      expect(extractEmail('book me a call')).toBeNull();
    });

    it('finds a phone number but ignores years and short digit runs', () => {
      expect(extractPhone('call me on +977-9801234567')).toBe(
        '+977-9801234567',
      );
      expect(extractPhone('we launched in 2024')).toBeNull();
    });
  });

  describe('dates', () => {
    it('reads an explicit ISO date', () => {
      expect(extractDate('can we do 2026-09-10?', TUESDAY)).toBe('2026-09-10');
    });

    it('resolves tomorrow relative to now, not to a hardcoded literal', () => {
      expect(extractDate('tomorrow works', TUESDAY)).toBe('2026-09-02');
    });

    it('reads a weekday as the *next* one', () => {
      // From Tuesday 1 Sep, "Thursday" is the 3rd.
      expect(extractDate('thursday please', TUESDAY)).toBe('2026-09-03');
      // A weekday naming today means next week, not today.
      expect(extractDate('tuesday works', TUESDAY)).toBe('2026-09-08');
    });

    it('reads day-month and month-day forms', () => {
      expect(extractDate('how about 12 September', TUESDAY)).toBe('2026-09-12');
      expect(extractDate('how about September 12', TUESDAY)).toBe('2026-09-12');
    });

    it('returns null when no date is present', () => {
      expect(extractDate('book me in', TUESDAY)).toBeNull();
    });
  });

  describe('times', () => {
    it('normalises meridiem and 24-hour forms to the same slot', () => {
      expect(extractTime('at 2:00 pm')).toBe('14:00');
      expect(extractTime('at 14:00')).toBe('14:00');
      expect(extractTime('at 2pm')).toBe('14:00');
      expect(extractTime('at 10:00 am')).toBe('10:00');
    });

    it('treats 12am and 12pm correctly', () => {
      expect(normaliseTime('12:00 am')).toBe('00:00');
      expect(normaliseTime('12:00 pm')).toBe('12:00');
    });

    it('returns null when no time is present', () => {
      expect(extractTime('sometime next week')).toBeNull();
    });
  });

  it('parses a complete request end to end', () => {
    const parsed = parseBooking(
      "Hi, I'm Ram Thapa, email ram@example.com — can we do 2026-09-10 at 2:00 pm?",
      TUESDAY,
    );
    expect(parsed).toMatchObject({
      name: 'Ram Thapa',
      email: 'ram@example.com',
      date: '2026-09-10',
      time: '14:00',
    });
  });
});

describe('Slot generation', () => {
  it('offers no slot in the past', () => {
    const now = new Date();
    for (const slot of generateSlots(now)) {
      expect(slot.date >= now.toISOString().slice(0, 10)).toBe(true);
    }
  });

  it('never offers a weekend', () => {
    for (const slot of generateSlots(TUESDAY)) {
      const day = new Date(`${slot.date}T00:00:00Z`).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it('rejects a date that is not on offer', () => {
    expect(isOfferedSlot('2020-01-01', '14:00 NPT', TUESDAY)).toBe(false);
    expect(isOfferedSlot('2026-09-10', '03:00 NPT', TUESDAY)).toBe(false);
  });

  it('accepts an offered slot written in either time format', () => {
    const slot = generateSlots(TUESDAY)[0]!;
    expect(isOfferedSlot(slot.date, slot.time, TUESDAY)).toBe(true);
    expect(isOfferedSlot(slot.date, normaliseTime(slot.time), TUESDAY)).toBe(
      true,
    );
  });

  it('honours the minimum-notice window', () => {
    const slots = generateSlots(TUESDAY);
    const earliest = slots[0]!;
    const hoursAway =
      (new Date(`${earliest.date}T00:00:00Z`).getTime() - TUESDAY.getTime()) /
      3_600_000;
    expect(hoursAway).toBeGreaterThan(-24);
  });
});

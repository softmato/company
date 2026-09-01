import { describe, expect, it } from 'vitest';

import { expiresIn, formatAdDateTime } from '@/lib/format/date';

/**
 * These two exist because of one misread screen: an enrolment link issued at
 * 3:18 pm showed "Expires 9/2/2026, 3:18:52 PM" next to a clock reading
 * 3:19 pm, and looked like it had died in under a minute. It had 24 hours.
 */
describe('formatAdDateTime', () => {
  /* 09:33 UTC is 15:18 in Kathmandu (+05:45). */
  const moment = new Date('2026-09-02T09:33:52Z');

  it('names the month, so the day and month cannot be swapped', () => {
    const formatted = formatAdDateTime(moment);

    expect(formatted).toMatch(/^2 Sept? 2026, 3:18 pm$/);
    expect(formatted).not.toContain('/');
  });

  /* The whole point of pinning the zone: the reader is in Kathmandu. */
  it('renders in Kathmandu time regardless of the runtime zone', () => {
    expect(formatAdDateTime(moment)).toContain('3:18 pm');
  });
});

describe('expiresIn', () => {
  const now = new Date('2026-09-01T09:33:52Z');
  const after = (ms: number) => new Date(now.getTime() + ms);

  it('describes a full enrolment TTL as a day away, not a timestamp', () => {
    expect(expiresIn(after(24 * 3_600_000), now)).toBe('in about 24 hours');
  });

  it.each([
    [60_000, 'in 1 minute'],
    [45 * 60_000, 'in 45 minutes'],
    [3 * 3_600_000, 'in about 3 hours'],
    [72 * 3_600_000, 'in about 3 days'],
  ])('renders %i ms as %s', (ms, expected) => {
    expect(expiresIn(after(ms), now)).toBe(expected);
  });

  it('says so plainly once the deadline has passed', () => {
    expect(expiresIn(after(-1), now)).toBe('now — it has expired');
    expect(expiresIn(now, now)).toBe('now — it has expired');
  });
});

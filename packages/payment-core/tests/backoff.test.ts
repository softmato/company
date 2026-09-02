import { describe, expect, it } from 'vitest';

import {
  FIRST_DELAY_MS,
  MAX_DELAY_MS,
  MAX_POLL_ATTEMPTS,
  nextPollAt,
  pollDelayMs,
  pollExhausted,
} from '../jobs/backoff';

describe('pollDelayMs', () => {
  it('starts short, because most payments resolve within a minute', () => {
    expect(pollDelayMs(0)).toBe(FIRST_DELAY_MS);
    expect(pollDelayMs(1)).toBe(60_000);
    expect(pollDelayMs(2)).toBe(120_000);
  });

  it('doubles until it reaches the ceiling, then holds', () => {
    expect(pollDelayMs(6)).toBe(32 * 60_000);
    expect(pollDelayMs(7)).toBe(MAX_DELAY_MS);
    expect(pollDelayMs(20)).toBe(MAX_DELAY_MS);
  });

  /**
   * `FIRST_DELAY_MS * 2 ** 60` is finite but far past integer precision, and
   * the value flows into `new Date(...)`. A `NaN` there writes a null
   * `next_poll_at`, and a transaction with a null next poll is never selected
   * again — a payment that stops being asked about, silently.
   */
  it('never overflows into an unusable delay', () => {
    for (const attempts of [32, 60, 1000, Number.MAX_SAFE_INTEGER]) {
      const delay = pollDelayMs(attempts);

      expect(Number.isFinite(delay)).toBe(true);
      expect(delay).toBe(MAX_DELAY_MS);
    }
  });

  it('treats a negative attempt count as the first', () => {
    expect(pollDelayMs(-5)).toBe(FIRST_DELAY_MS);
  });
});

describe('nextPollAt', () => {
  it('is always a valid future date', () => {
    const now = new Date('2026-09-01T00:00:00Z');

    for (const attempts of [0, 5, 40, Number.MAX_SAFE_INTEGER]) {
      const due = nextPollAt(attempts, now);

      expect(Number.isNaN(due.getTime())).toBe(false);
      expect(due.getTime()).toBeGreaterThan(now.getTime());
    }
  });
});

describe('pollExhausted', () => {
  it('keeps asking below the ceiling and stops at it', () => {
    expect(pollExhausted(MAX_POLL_ATTEMPTS - 1)).toBe(false);
    expect(pollExhausted(MAX_POLL_ATTEMPTS)).toBe(true);
  });

  /**
   * The curve has to reach roughly a day before giving up; a ceiling that bit
   * after ten minutes would hand a person every ordinary slow payment.
   */
  it('spans at least a day before giving up', () => {
    let total = 0;

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) total += pollDelayMs(i);

    expect(total).toBeGreaterThan(24 * 60 * 60_000);
  });
});

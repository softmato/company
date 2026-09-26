import { describe, expect, test } from 'vitest';

import { agingBucket } from '@/lib/ledger/aging';
import { rupees, toCsv } from '@/lib/ledger/csv';

describe('toCsv', () => {
  test('amounts are plain numbers a spreadsheet can add up', () => {
    expect(rupees(123_456_789n)).toBe('1234567.89');
    expect(rupees(-5n)).toBe('-0.05');
    expect(toCsv(['Amount'], [[100_000n]])).toBe('\uFEFFAmount\r\n1000.00\r\n');
  });

  test('commas, quotes and newlines are quoted', () => {
    expect(toCsv(['a'], [['Ram, Shyam "and" co\nltd']])).toContain(
      '"Ram, Shyam ""and"" co\nltd"',
    );
  });

  test('text that would run as a formula does not', () => {
    const csv = toCsv(['a'], [['=HYPERLINK("x")']]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('agingBucket', () => {
  const now = new Date('2026-09-26T00:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  test('buckets by whole days late', () => {
    expect(agingBucket(null, now)).toBe('Not yet due');
    expect(agingBucket(daysAgo(-3), now)).toBe('Not yet due');
    expect(agingBucket(daysAgo(30), now)).toBe('1–30 days');
    expect(agingBucket(daysAgo(31), now)).toBe('31–60 days');
    expect(agingBucket(daysAgo(91), now)).toBe('Over 90 days');
  });
});

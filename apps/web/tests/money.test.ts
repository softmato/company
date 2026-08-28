import { describe, expect, it } from 'vitest';

import { formatNpr, formatPaisa } from '../lib/format/money';

describe('formatPaisa', () => {
  it('always shows two decimals', () => {
    expect(formatPaisa(0n)).toBe('0.00');
    expect(formatPaisa(5n)).toBe('0.05');
    expect(formatPaisa(50n)).toBe('0.50');
    expect(formatPaisa(100n)).toBe('1.00');
  });

  it('leaves figures under a thousand ungrouped', () => {
    expect(formatPaisa(99900n)).toBe('999.00');
  });

  it('groups the first three digits, then pairs', () => {
    expect(formatPaisa(100000n)).toBe('1,000.00');
    expect(formatPaisa(2500000n)).toBe('25,000.00');
    expect(formatPaisa(24000000n)).toBe('2,40,000.00');
    expect(formatPaisa(48630000n)).toBe('4,86,300.00');
    expect(formatPaisa(123456700n)).toBe('12,34,567.00');
  });

  it('groups a crore and beyond in pairs all the way up', () => {
    expect(formatPaisa(1000000000n)).toBe('1,00,00,000.00');
    expect(formatPaisa(12345678900n)).toBe('12,34,56,789.00');
  });

  // A hyphen is short enough to miss at tabular width. This is the one
  // character on a ledger row that must never be missed.
  it('uses a true minus, not a hyphen', () => {
    expect(formatPaisa(-300000n)).toBe('−3,000.00');
    expect(formatPaisa(-300000n)).not.toContain('-');
  });

  it('carries the sign onto grouped figures', () => {
    expect(formatPaisa(-123456700n)).toBe('−12,34,567.00');
  });

  // Money is bigint everywhere upstream precisely so this stays exact.
  it('does not lose precision past Number.MAX_SAFE_INTEGER', () => {
    expect(formatPaisa(9007199254740993n)).toBe('9,00,71,99,25,47,409.93');
  });
});

describe('formatNpr', () => {
  it('prefixes the unit', () => {
    expect(formatNpr(8559800n)).toBe('NPR 85,598.00');
  });

  it('keeps the minus outside the unit', () => {
    expect(formatNpr(-300000n)).toBe('−NPR 3,000.00');
  });
});

import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import {
  decimalFromMinor,
  minorFromDecimal,
  minorFromInteger,
} from '../providers/money';

describe('minorFromDecimal', () => {
  /**
   * The regression this function exists for. eSewa reports thousands with a
   * separator, and the previous adapter used `parseFloat`, which stops at the
   * comma: `parseFloat('1,000.00')` is `1`. A confirmed NPR 1,000 payment
   * would have been read as NPR 1 — off by a factor of a thousand, and
   * surfacing as an amount mismatch that looks like the provider's fault.
   */
  it('reads eSewa thousands separators at full value', () => {
    expect(minorFromDecimal('1,000.00')).toBe(100000n);
    expect(minorFromDecimal('12,34,567.89')).toBe(123456789n);
  });

  it('scales by integer arithmetic, not floating point', () => {
    // 100.55 * 100 is 10054.999999999998 in IEEE 754.
    expect(minorFromDecimal('100.55')).toBe(10055n);
    expect(minorFromDecimal('0.07')).toBe(7n);
    expect(minorFromDecimal('2500.00')).toBe(250000n);
  });

  it('accepts a missing or partial fraction', () => {
    expect(minorFromDecimal('100')).toBe(10000n);
    expect(minorFromDecimal('100.5')).toBe(10050n);
  });

  it('rejects more precision than the currency has, rather than rounding', () => {
    // Rounding direction would be our invention, applied to someone's money.
    expect(() => minorFromDecimal('10.005')).toThrow(PaymentError);
  });

  it('rejects anything that is not a decimal number', () => {
    for (const bad of ['', '   ', 'abc', '10.0.0', '1e3', 'NPR 100', '--1']) {
      expect(() => minorFromDecimal(bad)).toThrow(PaymentError);
    }
  });

  it('handles negatives', () => {
    expect(minorFromDecimal('-45.50')).toBe(-4550n);
  });
});

describe('decimalFromMinor', () => {
  /**
   * eSewa signs the exact string it is sent, so `'2500'` and `'2500.00'` are
   * different signatures and only one of them verifies.
   */
  it('always emits the full number of minor digits', () => {
    expect(decimalFromMinor(250000n)).toBe('2500.00');
    expect(decimalFromMinor(0n)).toBe('0.00');
    expect(decimalFromMinor(5n)).toBe('0.05');
    expect(decimalFromMinor(50n)).toBe('0.50');
  });

  it('round-trips with minorFromDecimal', () => {
    for (const minor of [0n, 1n, 99n, 100n, 123456789n]) {
      expect(minorFromDecimal(decimalFromMinor(minor))).toBe(minor);
    }
  });
});

describe('minorFromInteger', () => {
  it('reads Khalti paisa without scaling', () => {
    expect(minorFromInteger(250000)).toBe(250000n);
    expect(minorFromInteger('250000')).toBe(250000n);
  });

  /**
   * `BigInt(data.total_amount || 0)` turned an absent amount into a confident
   * zero, which then reached the amount check as a mismatch rather than as the
   * missing field it was.
   */
  it('refuses an absent or non-integer amount instead of defaulting to zero', () => {
    for (const bad of [undefined, null, '', '25.5', 25.5, NaN, {}]) {
      expect(() => minorFromInteger(bad)).toThrow(PaymentError);
    }
  });
});

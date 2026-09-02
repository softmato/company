/**
 * The words are the check digit of a paper document, so they are tested
 * against the grouping the figures use — `formatPaisa` groups `1234567` as
 * `12,34,567`, and the words had better say "Twelve Lakh Thirty Four Thousand"
 * rather than "One Million Two Hundred Thirty Four Thousand". A document that
 * disagrees with itself is worse than one with no words at all.
 */
import { describe, expect, it } from 'vitest';

import { amountInWords, numberInWords } from '@/lib/documents/amount-in-words';
import { formatPaisa } from '@/lib/format/money';

describe('numberInWords', () => {
  it('handles the boundaries of each spoken group', () => {
    expect(numberInWords(0n)).toBe('Zero');
    expect(numberInWords(7n)).toBe('Seven');
    expect(numberInWords(13n)).toBe('Thirteen');
    expect(numberInWords(20n)).toBe('Twenty');
    expect(numberInWords(21n)).toBe('Twenty One');
    expect(numberInWords(100n)).toBe('One Hundred');
    expect(numberInWords(101n)).toBe('One Hundred One');
    expect(numberInWords(999n)).toBe('Nine Hundred Ninety Nine');
  });

  it('counts in lakh and crore, not million and billion', () => {
    expect(numberInWords(1_000n)).toBe('One Thousand');
    expect(numberInWords(100_000n)).toBe('One Lakh');
    expect(numberInWords(1_000_000n)).toBe('Ten Lakh');
    expect(numberInWords(10_000_000n)).toBe('One Crore');
    expect(numberInWords(1_000_000_000n)).toBe('One Arab');
  });

  it('reads the spec example the way the grouped figure reads', () => {
    expect(formatPaisa(123_456_700n)).toBe('12,34,567.00');
    expect(numberInWords(1_234_567n)).toBe(
      'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven',
    );
  });

  it('skips scales that are empty rather than saying zero of them', () => {
    // 1,00,00,007 — a crore and seven rupees, with four empty scales between.
    expect(numberInWords(10_000_007n)).toBe('One Crore Seven');
  });

  /**
   * A negative amount in words means a credit note was rendered through the
   * invoice path. Failing loudly here is cheaper than a customer receiving
   * "Minus Twenty Thousand Rupees Only".
   */
  it('refuses a negative amount rather than wording it', () => {
    expect(() => numberInWords(-1n)).toThrow(RangeError);
  });
});

describe('amountInWords', () => {
  it('renders the spec example exactly', () => {
    // Billing spec §5: "Amount in words: Twenty Thousand Rupees Only"
    expect(amountInWords(2_000_000n)).toBe('Twenty Thousand Rupees Only');
  });

  it('speaks paisa only when there are some', () => {
    expect(amountInWords(2_000_000n)).toBe('Twenty Thousand Rupees Only');
    expect(amountInWords(2_000_050n)).toBe(
      'Twenty Thousand Rupees and Fifty Paisa Only',
    );
    expect(amountInWords(2_000_001n)).toBe(
      'Twenty Thousand Rupees and One Paisa Only',
    );
  });

  it('inflects the rupee but not the paisa', () => {
    expect(amountInWords(100n)).toBe('One Rupee Only');
    expect(amountInWords(200n)).toBe('Two Rupees Only');
  });

  it('words a zero amount rather than producing an empty line', () => {
    expect(amountInWords(0n)).toBe('Zero Rupees Only');
  });

  it('agrees with the figure for the amounts this platform has settled', () => {
    // The two real sandbox payments of 2026-09-02 (todo.md §9.6).
    expect(formatPaisa(10_000n)).toBe('100.00');
    expect(amountInWords(10_000n)).toBe('One Hundred Rupees Only');

    expect(formatPaisa(15_000n)).toBe('150.00');
    expect(amountInWords(15_000n)).toBe('One Hundred Fifty Rupees Only');
  });
});

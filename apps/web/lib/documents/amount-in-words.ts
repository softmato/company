/**
 * `2000000n` → `Twenty Thousand Rupees Only`.
 *
 * Required on the invoice and the receipt (billing spec §5, §6). The words are
 * not decoration: they are the check digit of a paper document. A figure can
 * lose or gain a zero in a copy, a fax or a re-key, and the words are what an
 * accountant compares it against — which is exactly why they must be generated
 * from the same `bigint` paisa the figures are, and never typed.
 *
 * **Lakh–crore scale, not million–billion.** `12,34,567` reads as "Twelve Lakh
 * Thirty Four Thousand Five Hundred Sixty Seven", matching `formatPaisa`'s
 * grouping in `lib/format/money.ts`. A document whose figures group in pairs
 * and whose words count in millions is a document that disagrees with itself.
 *
 * Pure and unit-tested. No formatting concerns, no currency symbol — the
 * caller decides where this sits on the page.
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const;

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const;

/**
 * The scale names, largest first. Each takes a **two**-digit group except the
 * final remainder, which takes three — that asymmetry is the whole of the
 * lakh–crore system and the reason this cannot be a loop over thousands.
 */
const SCALES = [
  { divisor: 10_000_000_000_000n, name: 'Neel' },
  { divisor: 100_000_000_000n, name: 'Kharab' },
  { divisor: 1_000_000_000n, name: 'Arab' },
  { divisor: 10_000_000n, name: 'Crore' },
  { divisor: 100_000n, name: 'Lakh' },
  { divisor: 1_000n, name: 'Thousand' },
] as const;

/** 0–99. */
function underHundred(n: number): string {
  if (n < 20) return ONES[n] ?? '';

  const tens = TENS[Math.floor(n / 10)] ?? '';
  const ones = ONES[n % 10] ?? '';

  return ones ? `${tens} ${ones}` : tens;
}

/** 0–999. */
function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = underHundred(n % 100);

  if (hundreds === 0) return rest;

  const head = `${ONES[hundreds]} Hundred`;

  return rest ? `${head} ${rest}` : head;
}

/**
 * The number alone — no unit. `1234567n` → `Twelve Lakh Thirty Four Thousand
 * Five Hundred Sixty Seven`.
 *
 * Negative input is rejected rather than rendered. A document never states a
 * negative amount in words: a refund is its own document with its own wording,
 * and "Minus Twenty Thousand Rupees Only" on an invoice is a bug that has
 * reached the customer.
 */
export function numberInWords(value: bigint): string {
  if (value < 0n) {
    throw new RangeError(
      `numberInWords received ${value}. A document states a negative amount ` +
        'as its own document type (credit note), never as negative words.',
    );
  }

  if (value === 0n) return 'Zero';

  const parts: string[] = [];
  let remaining = value;

  for (const { divisor, name } of SCALES) {
    const group = remaining / divisor;

    if (group > 0n) {
      // Safe: every group here is at most two digits except the leading one,
      // and a leading group large enough to overflow a Number is an amount no
      // Nepali company invoices.
      parts.push(`${underThousand(Number(group))} ${name}`);
      remaining %= divisor;
    }
  }

  const tail = underThousand(Number(remaining));

  if (tail) parts.push(tail);

  return parts.join(' ');
}

/**
 * The line that goes on the document.
 *
 * `2000000n` → `Twenty Thousand Rupees Only`
 * `2000050n` → `Twenty Thousand Rupees and Fifty Paisa Only`
 *
 * **Paisa are only spoken when there are any.** "and Zero Paisa" on every
 * whole-rupee invoice is noise that trains the reader to skip the line, and
 * the line exists to be read.
 */
export function amountInWords(minor: bigint): string {
  const rupees = minor / 100n;
  const paisa = minor % 100n;

  const head = `${numberInWords(rupees)} ${rupees === 1n ? 'Rupee' : 'Rupees'}`;

  if (paisa === 0n) return `${head} Only`;

  // "Paisa" does not inflect — one paisa and ninety-nine paisa are both paisa.
  // Only the rupee does, which is why that one is a conditional and this is not.
  return `${head} and ${numberInWords(paisa)} Paisa Only`;
}

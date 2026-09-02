/**
 * Provider amounts → minor units, without floating point.
 *
 * Gateways report money as decimal text, and two of them do it in ways that
 * break the obvious parse:
 *
 *   * eSewa returns thousands separators — `"1,000.0"`. `parseFloat` reads
 *     that as `1`, understating the amount by a factor of a thousand and
 *     handing `completePayment` a mismatch it would flag as reconciliation
 *     rather than the parse bug it is.
 *   * `Math.round(parseFloat(x) * 100)` is float arithmetic on money. It is
 *     correct for every amount anyone tests with and wrong for some they do
 *     not.
 *
 * So the text is parsed as text and the scaling is integer. Anything that is
 * not unambiguously a decimal number is rejected rather than coerced — a
 * provider sending something unparseable is a fact worth an error, and
 * guessing at it is how a wrong amount reaches the ledger.
 */
import { PaymentError } from '../errors';

/** NPR, like every currency we take, has two minor digits. */
export const MINOR_EXPONENT = 2;

/** Optional sign, digits, optionally a single fractional part. Nothing else. */
const DECIMAL = /^-?\d+(?:\.\d+)?$/;

/**
 * Reads a provider's decimal amount into minor units.
 *
 * Separators are stripped before the shape is checked, so `"1,000.00"` and
 * `"1000.00"` are the same number. More fractional digits than the currency
 * has is an error, not something to round: a provider reporting `10.005` to a
 * two-digit currency is telling us something we do not understand, and the
 * rounding direction would be our invention.
 */
export function minorFromDecimal(
  raw: string | number,
  exponent: number = MINOR_EXPONENT,
): bigint {
  const text = String(raw)
    .trim()
    .replace(/[,\s_]/g, '');

  if (!DECIMAL.test(text)) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Provider amount is not a decimal number: ${JSON.stringify(raw)}`,
      { raw: String(raw) },
    );
  }

  const negative = text.startsWith('-');
  const [whole = '0', fraction = ''] = (negative ? text.slice(1) : text).split(
    '.',
  );

  if (fraction.length > exponent) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `Provider amount ${text} carries more precision than the currency has`,
      { raw: String(raw), exponent },
    );
  }

  const scale = 10n ** BigInt(exponent);
  const minor = BigInt(whole) * scale + BigInt(fraction.padEnd(exponent, '0'));

  return negative ? -minor : minor;
}

/**
 * Reads an amount a provider already reports in minor units.
 *
 * Khalti works entirely in paisa, so its `total_amount` and `fee` need no
 * scaling — but they still need checking. `BigInt(x)` throws on a float, and
 * the old adapter's `BigInt(data.total_amount || 0)` turned an absent amount
 * into a confident zero, which then reached the amount comparison as a
 * mismatch rather than as the missing field it was.
 */
export function minorFromInteger(raw: unknown): bigint {
  if (typeof raw === 'bigint') return raw;

  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw)) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        `Provider minor amount is not a safe integer: ${raw}`,
        { raw },
      );
    }

    return BigInt(raw);
  }

  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) {
    return BigInt(raw.trim());
  }

  throw new PaymentError(
    'VALIDATION_FAILED',
    `Provider minor amount is not an integer: ${JSON.stringify(raw)}`,
    { raw: String(raw) },
  );
}

/**
 * Minor units → the decimal text a gateway expects in a form field or a
 * signature base string. Integer division throughout, and always the full
 * number of minor digits: eSewa signs the exact string it is sent, so
 * `"2500"` and `"2500.00"` are different signatures and only one verifies.
 */
export function decimalFromMinor(
  minor: bigint,
  exponent: number = MINOR_EXPONENT,
): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(exponent);

  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(exponent, '0');

  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/**
 * Money display. **Paisa in, NPR out** (docs/handoff/UI_HANDOFF.md §3).
 *
 * Two things here are requirements rather than preferences:
 *
 *   1. **Lakh–crore grouping.** `12,34,567.00`, never `1,234,567.00`. Three
 *      digits, then pairs. This is how a Nepali reader parses a figure; the
 *      Western grouping makes them count zeros.
 *   2. **A true minus.** `−3,000.00` uses U+2212, not a hyphen. At tabular
 *      width a hyphen is short enough to be missed, and the one character
 *      that must never be missed on a ledger row is the sign.
 *
 * Formatting only. Never do arithmetic on the string these return — amounts
 * are bigint paisa everywhere upstream, and they stay that way.
 */

/** U+2212. Not a hyphen — see above. */
const MINUS = '−';

/** Groups the rupee part: last three digits, then pairs. `1234567` → `12,34,567`. */
function groupLakhCrore(rupees: string): string {
  if (rupees.length <= 3) return rupees;

  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3);
  const pairs = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${pairs},${last3}`;
}

/**
 * `1234567n` → `12,34,567.00`. Always two decimals, no currency symbol —
 * the column header or a `NPR` prefix carries the unit, so the figures
 * themselves stay narrow enough to align.
 */
export function formatPaisa(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;

  const rupees = groupLakhCrore((abs / 100n).toString());
  const paisa = (abs % 100n).toString().padStart(2, '0');

  return `${negative ? MINUS : ''}${rupees}.${paisa}`;
}

/** `1234567n` → `NPR 12,34,567.00`. For totals and anywhere the unit is not already stated. */
export function formatNpr(minor: bigint): string {
  const formatted = formatPaisa(minor);

  return formatted.startsWith(MINUS)
    ? `${MINUS}NPR ${formatted.slice(1)}`
    : `NPR ${formatted}`;
}

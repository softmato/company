/**
 * CSV for the accountant (Phase 7: "Export opens cleanly in a spreadsheet").
 *
 * Amounts go out as plain rupees with two decimals and no grouping — a
 * spreadsheet reads `1234.50` as a number and `12,34.50` as text. A leading
 * BOM makes Excel open the file as UTF-8, so a Nepali customer name survives.
 * Cells that a spreadsheet would run as a formula are neutralised.
 *
 * Pure, so the tests exercise it directly.
 */
export type Cell = string | number | bigint | Date | null | undefined;

/** Paisa → `1234.50`. */
export function rupees(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  return `${negative ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

function cell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'bigint'
      ? rupees(value)
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value);

  // A text cell starting with = + - @ runs as a formula when opened.
  const safe =
    typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return `\uFEFF${[header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

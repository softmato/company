/**
 * The pieces both PDF documents are built from — `components/documents/parts.tsx`,
 * drawn. An absent PAN is stated as absent, never dropped: a silently missing
 * PAN looks the same as a customer who has none, and only one of those is
 * something to go and fix.
 */
import { formatAd, formatBs } from '@/lib/format/date';

import { INK, MARGIN, type Sheet } from './pdf-sheet';
import type { Party } from './types';

/** BS first, AD beside it — the customer files by BS, the gateway statement is AD. */
export function dateLine(value: Date): string {
  return `${formatBs(value)} BS (${formatAd(value)})`;
}

/** Our contact lines under the seller name. The PAN line is always there. */
export function sellerLines(
  sheet: Sheet,
  seller: Party,
  show: { address?: boolean; phone?: boolean } = {},
): void {
  const lines = [
    show.address ? seller.address : null,
    show.phone ? seller.phone : null,
    seller.email,
  ].filter((line): line is string => Boolean(line));

  for (const line of lines) {
    sheet.text(MARGIN.left, line, { color: INK.soft, size: 8 });
    sheet.down(11);
  }

  sheet.text(MARGIN.left, seller.pan ? `PAN: ${seller.pan}` : 'PAN not set', {
    color: seller.pan ? INK.soft : INK.faint,
    face: seller.pan ? 'mono' : 'sans',
    size: 8,
  });
  sheet.down(11);
}

export function partyBlock(
  sheet: Sheet,
  label: string,
  party: Party,
  options: { showAbsentPan?: boolean; width: number },
): void {
  sheet.eyebrow(MARGIN.left, label);
  sheet.paragraph(
    MARGIN.left,
    party.name,
    options.width,
    { face: 'bold', size: 11 },
    14,
  );

  if (party.address)
    sheet.paragraph(
      MARGIN.left,
      party.address,
      options.width,
      { color: INK.soft, size: 8.5 },
      11.5,
    );

  if (party.pan) {
    sheet.text(MARGIN.left, `PAN: ${party.pan}`, {
      color: INK.soft,
      face: 'mono',
      size: 8.5,
    });
    sheet.down(11.5);
  } else if (options.showAbsentPan) {
    sheet.text(MARGIN.left, 'PAN not recorded', {
      color: INK.faint,
      size: 8.5,
    });
    sheet.down(11.5);
  }

  for (const line of [party.email, party.phone]) {
    if (!line) continue;

    sheet.text(MARGIN.left, line, {
      color: INK.soft,
      face: line === party.phone ? 'mono' : 'sans',
      size: 8.5,
    });
    sheet.down(11.5);
  }
}

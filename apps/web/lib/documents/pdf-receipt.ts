/**
 * The receipt as PDF — `components/documents/receipt-sheet.tsx`, drawn from
 * the same `ReceiptDocument`, in the same order, with the same words.
 *
 * The stamp reads the balance rather than the invoice's stored status, as on
 * the screen: this document is about what is true now that this payment has
 * landed (spec §6, "PAID IN FULL" or "PART PAYMENT").
 */
import { amountInWords } from '@/lib/documents/amount-in-words';
import { formatAdDateTime } from '@/lib/format/date';
import { formatPaisa } from '@/lib/format/money';

import { dateLine, partyBlock, sellerLines } from './pdf-parts';
import { INK, MARGIN, RIGHT, STATUS_INK, Sheet } from './pdf-sheet';
import type { ReceiptDocument } from './types';
import { vatNote } from './wording';

const VALUE_X = MARGIN.left + 120;

export async function drawReceipt(document: ReceiptDocument): Promise<Uint8Array> {
  const sheet = await Sheet.open(`Receipt ${document.receiptNo}`);
  const settled = document.balanceDueMinor <= 0n;

  const rows = (entries: Array<[string, string, boolean?]>) => {
    for (const [label, value, prose] of entries) {
      sheet.text(MARGIN.left, label, { color: INK.soft, size: 8.5 });
      sheet.text(VALUE_X, value, { face: prose ? 'sans' : 'mono', size: 9 });
      sheet.down(15);
    }
  };

  sheet.text(MARGIN.left, document.seller.name, { face: 'bold', size: 13 });
  sheet.down(16);
  sellerLines(sheet, document.seller);
  sheet.down(4);
  sheet.rule({ color: INK.strong, thickness: 1.2 }).down(28);

  sheet.text(MARGIN.left, 'PAYMENT RECEIPT', { face: 'bold', size: 16, tracking: 2.6 });
  sheet.down(26);

  rows([
    ['Receipt No.', document.receiptNo],
    ['Receipt Date', dateLine(document.paidAt)],
    ['Against Invoice', `${document.invoiceNo} (FY ${document.fiscalYear})`],
  ]);

  sheet.down(4);
  sheet.rule().down(20);
  partyBlock(sheet, 'Received from', document.customer, { width: RIGHT - MARGIN.left });
  sheet.down(10);

  /* ── The one figure the page is about ── */

  sheet.band(78);
  sheet.down(18);
  sheet.eyebrow(MARGIN.left + 14, 'Amount received');
  sheet.down(12);
  sheet.text(MARGIN.left + 14, `${document.currency} ${formatPaisa(document.amountMinor)}`, {
    face: 'monoBold',
    size: 22,
  });
  sheet.down(20);
  sheet.text(MARGIN.left + 14, amountInWords(document.amountMinor), { color: INK.soft, size: 8.5 });
  sheet.down(30);

  rows([
    ['Payment method', document.providerName, true],
    ['Transaction ID', document.providerRef ?? '—'],
    ['Paid at', `${formatAdDateTime(document.paidAt)} NPT`],
  ]);

  if (document.forDescription) {
    sheet.text(MARGIN.left, 'For', { color: INK.soft, size: 8.5 });
    sheet.paragraph(VALUE_X, document.forDescription, RIGHT - VALUE_X, { size: 9 }, 12);
    sheet.down(3);
  }

  sheet.down(4);
  sheet.rule().down(20);

  /* ── Where the invoice stands after this payment ── */

  const settlementTop = sheet.y;

  rows([
    ['Invoice total', formatPaisa(document.invoiceTotalMinor)],
    ['Total received', formatPaisa(document.totalReceivedMinor)],
    ['Balance due', formatPaisa(document.balanceDueMinor > 0n ? document.balanceDueMinor : 0n)],
  ]);

  const stampLabel = settled ? 'Paid in full' : 'Part payment';
  const stampColor = STATUS_INK[settled ? 'paid' : 'partially_paid'];
  const stampWidth = sheet.width(stampLabel.toUpperCase(), { face: 'bold', size: 9, tracking: 1.4 }) + 30;

  sheet.stamp(RIGHT - stampWidth, settlementTop + 10, stampLabel, stampColor);

  sheet.down(10);
  sheet.rule().down(16);
  sheet.paragraph(MARGIN.left, vatNote(document.seller.name), RIGHT - MARGIN.left, { color: INK.soft, size: 8 });

  // Our own trail, printed small: it means nothing to the customer, but it is
  // what an accountant traces the payment through.
  return sheet.save('Computer-generated receipt. No signature required.', document.journalNo ?? '');
}

/**
 * The invoice as PDF — `components/documents/invoice-sheet.tsx`, drawn.
 *
 * Same sections, same order, same words: every value comes from the one
 * `InvoiceDocument` the screen renders, and every fixed phrase from
 * `wording.ts`, so the two can only differ in how they look. The compliance
 * rules hold here exactly as there: the title is `INVOICE`, and there is no VAT
 * row — the footer sentence is the whole statement.
 *
 * Unlike a one-line plan invoice, an integrator's invoice can carry many
 * lines, so the table breaks across pages and repeats its header.
 */
import { degrees } from 'pdf-lib';

import { amountInWords } from '@/lib/documents/amount-in-words';
import { formatPaisa } from '@/lib/format/money';

import { dateLine, partyBlock, sellerLines } from './pdf-parts';
import { INK, MARGIN, RIGHT, STATUS_INK, Sheet } from './pdf-sheet';
import type { InvoiceDocument } from './types';
import { isoDay, PAY_NOTE, STATUS_LABEL, trimQuantity, vatNote } from './wording';

const COL = {
  no: MARGIN.left,
  description: MARGIN.left + 22,
  period: MARGIN.left + 238,
  qty: MARGIN.left + 344,
  rate: MARGIN.left + 420,
} as const;

const DESCRIPTION_WIDTH = COL.period - COL.description - 12;

export async function drawInvoice(document: InvoiceDocument): Promise<Uint8Array> {
  const sheet = await Sheet.open(`Invoice ${document.invoiceNo}`);
  const voided = document.status === 'void' || document.status === 'written_off';

  if (voided) {
    sheet.page.drawText(document.status === 'void' ? 'VOID' : 'WRITTEN OFF', {
      color: INK.faint,
      opacity: 0.12,
      rotate: degrees(32),
      size: document.status === 'void' ? 120 : 72,
      x: 130,
      y: 250,
    });
  }

  /* ── Masthead: us on the left, the title and its numbers on the right ── */

  const top = sheet.y;

  sheet.text(MARGIN.left, document.seller.name, { face: 'bold', size: 13 });
  sheet.down(16);
  sellerLines(sheet, document.seller, { address: true, phone: true });
  const leftBottom = sheet.y;

  sheet.y = top;
  sheet.right(RIGHT, 'INVOICE', { face: 'bold', size: 18, tracking: 3 });
  sheet.down(22);

  const meta: Array<[string, string]> = [
    ['Invoice No.', document.invoiceNo],
    ['Fiscal Year', document.fiscalYear],
  ];

  if (document.issuedAt) meta.push(['Invoice Date', dateLine(document.issuedAt)]);
  if (document.dueAt) meta.push(['Due Date', dateLine(document.dueAt)]);

  for (const [label, value] of meta) {
    sheet.text(RIGHT - 230, label, { color: INK.soft, size: 8 });
    sheet.right(RIGHT, value, { face: 'mono', size: 8.5 });
    sheet.down(13);
  }

  sheet.y = Math.min(sheet.y, leftBottom) - 6;
  sheet.rule({ color: INK.strong, thickness: 1.2 }).down(20);

  /* ── Bill to, and where the invoice stands ── */

  const partiesTop = sheet.y;

  partyBlock(sheet, 'Bill to', document.customer, { showAbsentPan: true, width: 280 });
  const partiesBottom = sheet.y;

  sheet.y = partiesTop;
  sheet.eyebrow(RIGHT - 180, 'Status');
  const badge = sheet.stamp(RIGHT - 180, sheet.y + 4, STATUS_LABEL[document.status], STATUS_INK[document.status]);
  sheet.down(badge.height + 10);
  sheet.text(RIGHT - 180, 'Amount due', { color: INK.soft, size: 8 });
  sheet.down(13);
  sheet.text(RIGHT - 180, `${document.currency} ${formatPaisa(document.dueMinor)}`, { face: 'monoBold', size: 11 });

  sheet.y = Math.min(sheet.y - 10, partiesBottom) - 8;

  /* ── Lines ── */

  const header = () => {
    sheet.band(20);
    sheet.down(13);

    const run = { color: INK.soft, face: 'bold' as const, size: 7.5 };

    sheet.text(COL.no + 2, '#', run);
    sheet.text(COL.description, 'Description', run);
    sheet.text(COL.period, 'Period', run);
    sheet.right(COL.qty, 'Qty', run);
    sheet.right(COL.rate, 'Rate', run);
    sheet.right(RIGHT, 'Amount', run);
    sheet.down(7);
    sheet.rule({ color: INK.strong, thickness: 0.9 }).down(14);
  };

  header();

  for (const line of document.lines) {
    const described = sheet.wrap(line.description, DESCRIPTION_WIDTH, { size: 9 });
    const period =
      line.periodStart && line.periodEnd
        ? [`${isoDay(line.periodStart)} to`, isoDay(line.periodEnd)]
        : ['—'];
    const rows = Math.max(described.length, period.length);

    sheet.ensure(rows * 12 + 14, header);

    const rowTop = sheet.y;

    sheet.text(COL.no + 2, String(line.lineNo), { face: 'mono', size: 8.5 });
    sheet.right(COL.qty, trimQuantity(line.quantity), { face: 'mono', size: 8.5 });
    sheet.right(COL.rate, formatPaisa(line.unitPriceMinor), { face: 'mono', size: 8.5 });
    sheet.right(RIGHT, formatPaisa(line.amountMinor), { face: 'mono', size: 8.5 });

    described.forEach((text, index) => {
      sheet.y = rowTop - index * 12;
      sheet.text(COL.description, text, { size: 9 });
    });
    period.forEach((text, index) => {
      sheet.y = rowTop - index * 12;
      sheet.text(COL.period, text, { color: INK.soft, face: 'mono', size: 7.5 });
    });

    sheet.y = rowTop - (rows - 1) * 12 - 8;
    sheet.rule().down(14);
  }

  if (document.lines.length === 0) {
    sheet.text(COL.description, 'This invoice has no lines recorded.', { color: INK.faint, size: 9 });
    sheet.down(8);
    sheet.rule().down(14);
  }

  /* ── Totals, right-hand column ── */

  const rows: Array<[string, string, 'plain' | 'grand' | 'due']> = [
    ['Subtotal', formatPaisa(document.subtotalMinor), 'plain'],
  ];

  // Shown only when there is one, as on the screen — and a non-zero tax is
  // printed rather than silently dropped from a total the customer pays.
  if (document.discountMinor > 0n) rows.push(['Discount', `-${formatPaisa(document.discountMinor)}`, 'plain']);
  if (document.taxMinor > 0n) rows.push(['Tax', formatPaisa(document.taxMinor), 'plain']);

  rows.push(
    [`Total (${document.currency})`, formatPaisa(document.totalMinor), 'grand'],
    ['Amount paid', formatPaisa(document.paidMinor), 'plain'],
    ['Amount due', formatPaisa(document.dueMinor), 'due'],
  );

  sheet.ensure(rows.length * 18 + 60);

  const totalsLeft = RIGHT - 220;

  for (const [label, value, weight] of rows) {
    if (weight !== 'plain') {
      sheet.down(2);
      sheet.rule({ color: INK.strong, from: totalsLeft, thickness: weight === 'due' ? 1.6 : 0.9 });
      sheet.down(13);
    }

    const bold = weight !== 'plain';
    const size = weight === 'due' ? 10.5 : weight === 'grand' ? 9.5 : 9;

    sheet.text(totalsLeft, label, { color: bold ? INK.text : INK.soft, face: bold ? 'bold' : 'sans', size });
    sheet.right(RIGHT, value, { face: bold ? 'monoBold' : 'mono', size });
    sheet.down(16);
  }

  sheet.down(10);

  /* ── Amount in words ── */

  sheet.ensure(40);
  sheet.eyebrow(MARGIN.left, 'Amount in words');
  sheet.paragraph(MARGIN.left, amountInWords(document.totalMinor), RIGHT - MARGIN.left, { size: 9 });
  sheet.down(10);

  /* ── What the SaaS said it was selling — description, never arithmetic ── */

  const plan = document.presentation;

  if (plan) {
    sheet.ensure(60);
    sheet.eyebrow(MARGIN.left, `${plan.plan_name}${plan.billing_period ? ` · ${plan.billing_period}` : ''}`);

    if (plan.tagline) sheet.paragraph(MARGIN.left, plan.tagline, RIGHT - MARGIN.left, { color: INK.soft, size: 9 });

    for (const feature of plan.features ?? []) {
      sheet.ensure(13);
      sheet.text(MARGIN.left + 2, '•', { color: INK.soft, size: 9 });
      sheet.paragraph(MARGIN.left + 12, feature, RIGHT - MARGIN.left - 12, { size: 9 });
    }

    if (plan.highlights?.length) {
      sheet.down(2);
      sheet.paragraph(MARGIN.left, plan.highlights.join('  ·  '), RIGHT - MARGIN.left, { color: INK.soft, size: 8.5 });
    }

    sheet.down(10);
  }

  /* ── Notes ── */

  sheet.ensure(46);
  sheet.rule().down(16);
  sheet.paragraph(MARGIN.left, PAY_NOTE, RIGHT - MARGIN.left, { color: INK.soft, size: 8 });
  sheet.paragraph(MARGIN.left, vatNote(document.seller.name), RIGHT - MARGIN.left, { color: INK.soft, size: 8 });

  return sheet.save('This is a computer-generated invoice.', document.invoiceNo);
}

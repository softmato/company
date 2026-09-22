/**
 * The PDF is drawn by pdf-lib from the document values — no browser.
 *
 * Pinned here: every sample becomes a real PDF; a long invoice breaks across
 * pages instead of running off the bottom; and text the standard fonts cannot
 * draw is refused as `{ ok: false }` — **never thrown, never garbled** — so the
 * caller serves the HTML exactly as it did when no engine was installed.
 */
import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';

import { renderPdf } from '@/lib/documents/pdf';
import {
  SAMPLE_INVOICE,
  SAMPLE_INVOICE_PART_PAID,
  SAMPLE_INVOICE_VOID,
  SAMPLE_RECEIPT,
  SAMPLE_RECEIPT_PARTIAL,
} from '@/lib/documents/samples';

async function pages(result: Awaited<ReturnType<typeof renderPdf>>) {
  if (!result.ok) throw new Error(result.reason);

  expect(result.pdf.subarray(0, 5).toString()).toBe('%PDF-');

  return PDFDocument.load(result.pdf);
}

describe('renderPdf', () => {
  test.each([
    ['invoice, unpaid', SAMPLE_INVOICE],
    ['invoice, part paid', SAMPLE_INVOICE_PART_PAID],
    ['invoice, void', SAMPLE_INVOICE_VOID],
    ['receipt, paid', SAMPLE_RECEIPT],
    ['receipt, partial', SAMPLE_RECEIPT_PARTIAL],
  ] as const)(
    '%s → a one-page PDF titled with its number',
    async (_, document) => {
      const pdf = await pages(await renderPdf(document));
      const number =
        document.kind === 'invoice' ? document.invoiceNo : document.receiptNo;

      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getTitle()).toContain(number);
    },
  );

  test('a long invoice breaks across pages', async () => {
    const line = SAMPLE_INVOICE.lines[0]!;
    const lines = Array.from({ length: 60 }, (_, index) => ({
      ...line,
      lineNo: index + 1,
    }));
    const pdf = await pages(await renderPdf({ ...SAMPLE_INVOICE, lines }));

    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  test('typography the fonts lack but can say plainly is drawn, not refused', async () => {
    const result = await renderPdf({
      ...SAMPLE_RECEIPT,
      forDescription: 'Plan − annual → renewal',
    });

    expect(result.ok).toBe(true);
  });

  test('a name the fonts cannot draw falls back to HTML instead of printing garbage', async () => {
    const result = await renderPdf({
      ...SAMPLE_INVOICE,
      customer: { ...SAMPLE_INVOICE.customer, name: 'सगरमाथा होस्टल' },
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/served as HTML/);
  });
});

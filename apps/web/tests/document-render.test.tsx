/**
 * What the invoice and receipt must say, asserted against the rendered HTML.
 *
 * These are not snapshot tests. A snapshot would go green on a re-record and
 * would fail on every deliberate spacing change, which is the wrong sensitivity
 * in both directions. What is pinned here is what a Nepali PAN bill is
 * *obliged* to carry and what it is obliged not to — the things that would
 * make a document non-compliant or wrong rather than merely ugly.
 *
 * The compliance rules come from the billing spec §5 and §6.
 */
import { describe, expect, it } from 'vitest';

import {
  SAMPLE_INVOICE,
  SAMPLE_INVOICE_PART_PAID,
  SAMPLE_INVOICE_VOID,
  SAMPLE_RECEIPT,
  SAMPLE_RECEIPT_PARTIAL,
} from '@/lib/documents/samples';
import { invoiceHtml, receiptHtml } from '@/lib/documents/render-html';
import type { InvoiceDocument } from '@/lib/documents/types';

/** HTML entities get in the way of asserting on text. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, ' ');
}

describe('the invoice', () => {
  const html = invoiceHtml(SAMPLE_INVOICE);
  const body = text(html);

  it('is titled INVOICE and never a tax invoice', () => {
    expect(body).toContain('Invoice');

    /*
     * The single most important negative assertion in this file. Softmato is
     * PAN-registered and not VAT-registered; "Tax Invoice" and "VAT Invoice"
     * are claims about a registration it does not hold, and printing either
     * on a customer document is a compliance problem rather than a typo.
     */
    expect(body.toLowerCase()).not.toContain('tax invoice');
    expect(body.toLowerCase()).not.toContain('vat invoice');
  });

  it('never prints a zero VAT row, which would imply registration', () => {
    // The footer sentence may say "VAT"; a totals *row* may not.
    expect(html).not.toMatch(/<th[^>]*>\s*VAT/i);
    expect(body).not.toContain('VAT: 0');
    expect(body).not.toContain('VAT 0%');
  });

  it('states the VAT position in words instead', () => {
    expect(body).toContain('is not registered for VAT');
  });

  it('carries both PANs and the invoice number', () => {
    expect(body).toContain('PAN: 999999999');
    expect(body).toContain('PAN: 888888888');
    expect(body).toContain('INV-2083/84-000125');
    expect(body).toContain('2083/84');
  });

  it('states dates in BS with AD beneath', () => {
    expect(body).toContain('Bhadra 2083 BS');
    expect(body).toContain('Aug 2026');
  });

  it('carries the amount in words, matching the total', () => {
    expect(body).toContain('Twenty Thousand Rupees Only');
  });

  it('shows the figures grouped lakh–crore, not in thousands', () => {
    /*
     * The samples are all under a lakh, where the two conventions agree — so
     * an amount big enough to disagree is built here rather than pinning the
     * grouping to a figure that could never have caught it.
     *
     * NPR 12,34,567.00 in the Nepali convention; 1,234,567.00 in the Western
     * one. A reader parsing the wrong grouping counts the zeros wrong by a
     * factor of ten, which is the mistake this whole convention exists to
     * prevent.
     */
    const large: InvoiceDocument = {
      ...SAMPLE_INVOICE,
      lines: [
        { ...SAMPLE_INVOICE.lines[0]!, unitPriceMinor: 123_456_700n, amountMinor: 123_456_700n },
      ],
      subtotalMinor: 123_456_700n,
      totalMinor: 123_456_700n,
      dueMinor: 123_456_700n,
    };

    const rendered = text(invoiceHtml(large));

    expect(rendered).toContain('12,34,567.00');
    expect(rendered).not.toContain('1,234,567.00');
    // And the words agree with the figure, which is what they are there for.
    expect(rendered).toContain(
      'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only',
    );
  });

  it('shows a discount row only when there is a discount', () => {
    expect(text(invoiceHtml(SAMPLE_INVOICE))).not.toContain('Discount');
    expect(text(invoiceHtml(SAMPLE_INVOICE_PART_PAID))).toContain('Discount');
  });

  it('watermarks a voided invoice but keeps its number and figures', () => {
    const voided = text(invoiceHtml(SAMPLE_INVOICE_VOID));

    expect(voided).toContain('Void');
    // Spec §5: a voided invoice keeps its number — it stays in the sequence.
    expect(voided).toContain('INV-2083/84-000127');
    expect(voided).toContain('20,000.00');
  });

  it('is a self-contained file with no stylesheet to fetch', () => {
    // The PDF is rendered by a browser that cannot reach this app.
    expect(html).toContain('<style>');
    expect(html).not.toMatch(/<link[^>]+href="\/(?!\/)/);
    expect(html).not.toContain('<script');
  });

  it('never leaks the admin-only warning banner into the document', () => {
    const live: InvoiceDocument = {
      ...SAMPLE_INVOICE,
      renderedFromLiveParties: true,
      seller: { ...SAMPLE_INVOICE.seller, pan: null },
    };

    const rendered = text(invoiceHtml(live));

    expect(rendered).not.toContain('This document is not complete');
    // But the absence is still stated on the document itself, so a customer
    // and an auditor see the same gap the admin does.
    expect(rendered).toContain('PAN not set');
  });
});

describe('the receipt', () => {
  const html = receiptHtml(SAMPLE_RECEIPT);
  const body = text(html);

  it('cites the invoice it settles and its own number', () => {
    expect(body).toContain('TXN-2083/84-00000008');
    expect(body).toContain('INV-2083/84-000125');
  });

  it('shows the gateway reference, for the payer to reconcile against', () => {
    expect(body).toContain('000GYAH');
    expect(body).toContain('eSewa');
  });

  it('states the amount received in figures and words', () => {
    expect(body).toContain('NPR 20,000.00');
    expect(body).toContain('Twenty Thousand Rupees Only');
  });

  it('reads PAID IN FULL only when the balance is actually clear', () => {
    expect(body).toContain('Paid in full');

    const partial = text(receiptHtml(SAMPLE_RECEIPT_PARTIAL));

    expect(partial).toContain('Part payment');
    expect(partial).not.toContain('Paid in full');
    // And the remainder is shown, not left for the customer to work out.
    expect(partial).toContain('20,000.00');
  });

  it('never restates the invoice line items', () => {
    // Spec §6: the invoice is the document of record for what was sold.
    expect(body).not.toContain('Description');
    expect(body).not.toContain('Qty');
  });

  it('prints on A5 so it is not mistaken for the invoice', () => {
    expect(html).toContain('@page { size: A5');
    expect(invoiceHtml(SAMPLE_INVOICE)).toContain('@page { size: A4');
  });
});

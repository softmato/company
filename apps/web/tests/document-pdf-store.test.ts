/**
 * The policy in front of the PDF engine.
 *
 * Three things have to hold, and each of them is a way a customer could be
 * handed the wrong file rather than a slow one:
 *
 *   - a stored PDF is served without launching a browser;
 *   - a document that has *changed* does not match what was stored, so the
 *     stale copy is never served — this is the whole reason the key carries a
 *     fingerprint of the rendered HTML;
 *   - a missing engine still falls back to HTML with a header, exactly as it
 *     did before any storage existed. That fallback is what makes the document
 *     layer deployable while the engine question is still open, and putting a
 *     cache in front of it must not quietly turn it into an error.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

const renderPdf = vi.fn();
const readDocumentPdf = vi.fn();
const writeDocumentPdf = vi.fn();

vi.mock('@/lib/documents/pdf', () => ({
  renderPdf: (html: string) => renderPdf(html),
  pdfAvailable: () => true,
}));

vi.mock('@/lib/documents/pdf-store', async () => {
  /* The key derivation is real; only the bucket is faked. */
  const actual = await vi.importActual<
    typeof import('@/lib/documents/pdf-store')
  >('@/lib/documents/pdf-store');

  return {
    ...actual,
    readDocumentPdf: (key: string) => readDocumentPdf(key),
    writeDocumentPdf: (
      document: unknown,
      key: string,
      pdf: Buffer,
    ) => writeDocumentPdf(document, key, pdf),
  };
});

const { documentPdf } = await import('@/lib/documents/document-pdf');
const { documentKeyFor } = await import('@/lib/documents/pdf-store');

/**
 * The two fields the key is built from. Everything else a document carries is
 * irrelevant here — the fingerprint comes from the HTML, not from the value.
 */
const invoice = {
  kind: 'invoice',
  invoiceNo: 'INV-2083/84-000012',
  fiscalYear: '2083/84',
  issuedAt: new Date('2026-09-02T00:00:00Z'),
} as never;

beforeEach(() => {
  renderPdf.mockReset();
  readDocumentPdf.mockReset();
  writeDocumentPdf.mockReset();
  writeDocumentPdf.mockResolvedValue(true);
});

describe('documentKeyFor', () => {
  test('is stable for the same rendering', () => {
    expect(documentKeyFor(invoice, '<p>a</p>')).toBe(
      documentKeyFor(invoice, '<p>a</p>'),
    );
  });

  test('changes when the document does — a paid invoice is not the unpaid one', () => {
    expect(documentKeyFor(invoice, '<p>UNPAID</p>')).not.toBe(
      documentKeyFor(invoice, '<p>PAID</p>'),
    );
  });

  test('is a key the private bucket layout recognises', () => {
    expect(documentKeyFor(invoice, '<p>a</p>')).toMatch(
      /^company\/invoices\/2083-84\/INV-2083-84-000012-[0-9a-f]{16}\.pdf$/,
    );
  });
});

describe('documentPdf', () => {
  test('serves the stored copy without starting a browser', async () => {
    readDocumentPdf.mockResolvedValue(Buffer.from('%PDF-stored'));

    const result = await documentPdf(invoice, '<p>a</p>');

    expect(result).toEqual({
      ok: true,
      pdf: Buffer.from('%PDF-stored'),
      source: 'store',
    });
    expect(renderPdf).not.toHaveBeenCalled();
    expect(writeDocumentPdf).not.toHaveBeenCalled();
  });

  test('renders and stores on a miss, under the key it just looked up', async () => {
    readDocumentPdf.mockResolvedValue(null);
    renderPdf.mockResolvedValue({ ok: true, pdf: Buffer.from('%PDF-fresh') });

    const result = await documentPdf(invoice, '<p>a</p>');

    expect(result).toEqual({
      ok: true,
      pdf: Buffer.from('%PDF-fresh'),
      source: 'render',
    });

    const key = documentKeyFor(invoice, '<p>a</p>');
    expect(readDocumentPdf).toHaveBeenCalledWith(key);
    expect(writeDocumentPdf).toHaveBeenCalledWith(
      invoice,
      key,
      Buffer.from('%PDF-fresh'),
    );
  });

  test('a changed document misses its old object rather than matching it', async () => {
    readDocumentPdf.mockResolvedValue(null);
    renderPdf.mockResolvedValue({ ok: true, pdf: Buffer.from('%PDF-paid') });

    await documentPdf(invoice, '<p>PAID</p>');

    expect(readDocumentPdf).toHaveBeenCalledWith(
      documentKeyFor(invoice, '<p>PAID</p>'),
    );
    expect(readDocumentPdf).not.toHaveBeenCalledWith(
      documentKeyFor(invoice, '<p>UNPAID</p>'),
    );
  });

  test('passes a missing engine straight through, and stores nothing', async () => {
    readDocumentPdf.mockResolvedValue(null);
    renderPdf.mockResolvedValue({ ok: false, reason: 'No PDF engine configured.' });

    const result = await documentPdf(invoice, '<p>a</p>');

    expect(result).toEqual({ ok: false, reason: 'No PDF engine configured.' });
    expect(writeDocumentPdf).not.toHaveBeenCalled();
  });

  test('serves a degraded render but refuses to archive it', async () => {
    readDocumentPdf.mockResolvedValue(null);
    renderPdf.mockResolvedValue({
      ok: true,
      pdf: Buffer.from('%PDF-wrong-font'),
      degraded: 'Web fonts did not load; the document is set in a fallback face.',
    });

    const result = await documentPdf(invoice, '<p>a</p>');

    // The person who asked still gets a document...
    expect(result).toMatchObject({ ok: true, source: 'render' });
    expect(result.ok && result.degraded).toBeTruthy();
    // ...but the key is the document's identity, so storing this one would
    // answer every future request with the wrong typeface, permanently.
    expect(writeDocumentPdf).not.toHaveBeenCalled();
  });

  test('a bucket that cannot be written to still returns the PDF', async () => {
    readDocumentPdf.mockResolvedValue(null);
    writeDocumentPdf.mockResolvedValue(false);
    renderPdf.mockResolvedValue({ ok: true, pdf: Buffer.from('%PDF-fresh') });

    await expect(documentPdf(invoice, '<p>a</p>')).resolves.toMatchObject({
      ok: true,
      source: 'render',
    });
  });
});

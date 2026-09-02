/**
 * The private bucket, for real.
 *
 * Everything else about document storage is tested against a fake, which
 * proves the policy and proves nothing about R2. Credentials, the endpoint,
 * the checksum setting, whether a `PutObject` under our key layout is actually
 * accepted — those only fail against Cloudflare, and the first time we would
 * otherwise find out is on a customer's invoice.
 *
 * **Skipped unless `R2_LIVE_TEST=1`.** It writes to a real bucket and needs
 * network, so it is not part of the ordinary run:
 *
 *     R2_LIVE_TEST=1 pnpm --filter @softmato/web test private-storage-live
 *
 * The round-trip writes under `company/invoices/0000-00/`, a fiscal year that
 * cannot collide with a real document, and deletes nothing — the objects it
 * leaves are a few bytes each and a bucket listing that shows them is a
 * truthful record of when this last passed.
 *
 * The second half goes through the real path end to end — a real invoice out
 * of the database, the real Chrome, the real bucket — and is what proves the
 * second download of a document does not start a browser. It needs
 * `SOFTMATO_LIVE_INVOICE` naming an invoice that exists, because inventing one
 * would only prove the code can miss a cache.
 */
import { describe, expect, test } from 'vitest';

const live = process.env['R2_LIVE_TEST'] === '1';

describe.skipIf(!live)('private R2 bucket', () => {
  test('stores an object and reads back exactly what was written', async () => {
    const { privateStorageConfigured } =
      await import('@/lib/storage/private-client');
    const { readPrivateObject, writePrivateObject } =
      await import('@/lib/storage/private-object');
    const { documentPdfKey } = await import('@/lib/documents/object-key');

    expect(privateStorageConfigured).toBe(true);

    const key = documentPdfKey({
      kind: 'invoice',
      number: 'INV-0000/00-000001',
      fiscalYear: '0000/00',
      fingerprint: 'abcdef0123456789',
    });

    // `%PDF-` so anything reading the bucket sees the file type it claims.
    const body = Buffer.from(`%PDF-live-check ${new Date().toISOString()}`);

    expect(
      await writePrivateObject({
        key,
        body,
        contentType: 'application/pdf',
      }),
    ).toBe(true);

    expect(await readPrivateObject(key)).toEqual(body);
  }, 30_000);

  test('a key that was never written reads as absent, not as an error', async () => {
    const { readPrivateObject } = await import('@/lib/storage/private-object');

    expect(
      await readPrivateObject('company/invoices/0000-00/nothing-here.pdf'),
    ).toBeNull();
  }, 30_000);
});

const invoiceNo = process.env['SOFTMATO_LIVE_INVOICE'];

describe.skipIf(!live || !invoiceNo)('a real invoice, end to end', () => {
  test('renders once, then comes back from the bucket', async () => {
    const { buildInvoiceDocument } =
      await import('@/lib/documents/invoice-document');
    const { invoiceHtml } = await import('@/lib/documents/render-html');
    const { documentPdf } = await import('@/lib/documents/document-pdf');
    const { pdfAvailable } = await import('@/lib/documents/pdf');

    expect(pdfAvailable(), 'no Chrome on this machine').toBe(true);

    const document = await buildInvoiceDocument(invoiceNo!);
    expect(document, `no invoice ${invoiceNo}`).not.toBeNull();

    const html = invoiceHtml(document!);

    const first = await documentPdf(document!, html);
    expect(first.ok).toBe(true);
    // `%PDF-` and nothing else: an HTML fallback with a .pdf name is the
    // failure this whole layer exists to keep out of a customer's inbox.
    expect(first.ok && first.pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const second = await documentPdf(document!, html);
    expect(second.ok && second.source).toBe('store');
    expect(
      second.ok && second.pdf.equals(first.ok ? first.pdf : Buffer.alloc(0)),
    ).toBe(true);
  }, 120_000);
});

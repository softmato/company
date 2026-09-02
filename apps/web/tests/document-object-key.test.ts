/**
 * Where a rendered invoice or receipt is stored, and what it refuses to store.
 *
 * Two things are being pinned here, and only one of them is about paths.
 *
 * The first is that a document number and a fiscal year both contain a slash —
 * `INV-2083/84-000012`, `2083/84` — and a slash in an object key is a
 * directory. Getting that wrong does not fail; it writes a real invoice to a
 * plausible-looking path nobody thinks to look in.
 *
 * The second is the fingerprint, which is what makes it safe to serve a stored
 * PDF at all. An invoice changes after it is issued — it gets paid, it goes
 * past due — so a key that did not depend on the rendered content would pin
 * the first version forever and hand a customer a PDF saying UNPAID about an
 * invoice they settled in March.
 */
import { describe, expect, test } from 'vitest';

import {
  documentPdfKey,
  FINGERPRINT_LENGTH,
  INVOICE_PDF_PREFIX,
  RECEIPT_PDF_PREFIX,
} from '@/lib/documents/object-key';

const FINGERPRINT = '0123456789abcdef';

const invoice = (over: Partial<Parameters<typeof documentPdfKey>[0]> = {}) =>
  documentPdfKey({
    kind: 'invoice',
    number: 'INV-2083/84-000012',
    fiscalYear: '2083/84',
    fingerprint: FINGERPRINT,
    ...over,
  });

describe('documentPdfKey', () => {
  test('puts an invoice under the private bucket layout ENVIRONMENT.md §3 names', () => {
    expect(invoice()).toBe(
      `${INVOICE_PDF_PREFIX}/2083-84/INV-2083-84-000012-${FINGERPRINT}.pdf`,
    );
  });

  test('receipts get their own prefix, not a folder inside invoices', () => {
    expect(
      documentPdfKey({
        kind: 'receipt',
        number: 'TXN-2083/84-00000008',
        fiscalYear: '2083/84',
        fingerprint: FINGERPRINT,
      }),
    ).toBe(
      `${RECEIPT_PDF_PREFIX}/2083-84/TXN-2083-84-00000008-${FINGERPRINT}.pdf`,
    );
  });

  test('the number and the year contribute exactly one path segment each', () => {
    // Four segments: owner, category, year, file. A slash that survived would
    // silently add a fifth.
    expect(invoice().split('/')).toHaveLength(4);
  });

  test('a different rendering of the same invoice is a different object', () => {
    expect(invoice()).not.toBe(invoice({ fingerprint: 'fedcba9876543210' }));
  });

  test('refuses a traversal rather than scrubbing it', () => {
    expect(() => invoice({ number: '../../etc/passwd' })).toThrow();
    expect(() => invoice({ fiscalYear: '..' })).toThrow();
    expect(() => invoice({ number: 'INV-2083/../84-000012' })).toThrow();
  });

  test('refuses a number that is empty, absolute, or full of surprises', () => {
    expect(() => invoice({ number: '' })).toThrow();
    expect(() => invoice({ number: '/INV-1' })).toThrow();
    expect(() => invoice({ number: 'INV 2083-000012' })).toThrow();
    expect(() => invoice({ number: String.raw`INV-2083\84` })).toThrow();
  });

  test('refuses a fingerprint that is not a full-width hex digest', () => {
    expect(() => invoice({ fingerprint: '' })).toThrow();
    expect(() => invoice({ fingerprint: 'abc' })).toThrow();
    expect(() => invoice({ fingerprint: FINGERPRINT.toUpperCase() })).toThrow();
    expect(() => invoice({ fingerprint: FINGERPRINT + '0' })).toThrow();
    expect(FINGERPRINT).toHaveLength(FINGERPRINT_LENGTH);
  });
});

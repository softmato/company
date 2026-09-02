import 'server-only';
import { createHash } from 'node:crypto';

import {
  readPrivateObject,
  writePrivateObject,
} from '@/lib/storage/private-object';
import { privateStorageConfigured } from '@/lib/storage/private-client';

import { documentPdfKey, FINGERPRINT_LENGTH } from './object-key';
import type { InvoiceDocument, ReceiptDocument } from './types';

/**
 * The stored copy of a rendered document.
 *
 * Rendering a PDF means running a browser, which is the slowest and most
 * fragile thing this application does. A document, once rendered, is a fixed
 * sequence of bytes — so it is rendered once and read back afterwards, and the
 * browser only ever runs for a document nobody has printed yet.
 *
 * **Storage being unavailable is not an error.** With no private bucket
 * configured, or with R2 refusing, every function here reports nothing and the
 * caller renders exactly as it did before any of this existed. That is the
 * same rule the PDF engine itself follows (`pdf.ts`), for the same reason: a
 * customer clicking "download my invoice" must never be told no because of
 * infrastructure they cannot see.
 */

export type StorableDocument = InvoiceDocument | ReceiptDocument;

/**
 * Where this exact rendering of this document belongs.
 *
 * The fingerprint is taken over the **HTML**, not over a list of fields, and
 * that choice is doing real work. A field list is a second description of what
 * a document contains, kept by hand, and the day someone adds a line to the
 * template without adding it to the list is the day a stale PDF starts being
 * served. The HTML *is* the document; hashing it cannot fall out of step with
 * it, and a template change correctly invalidates every document at once.
 */
export function documentKeyFor(
  document: StorableDocument,
  html: string,
): string {
  return documentPdfKey({
    kind: document.kind,
    number:
      document.kind === 'invoice' ? document.invoiceNo : document.receiptNo,
    fiscalYear: document.fiscalYear,
    fingerprint: createHash('sha256')
      .update(html, 'utf8')
      .digest('hex')
      .slice(0, FINGERPRINT_LENGTH),
  });
}

/** The stored PDF, or `null` when there is none and when there is no bucket. */
export async function readDocumentPdf(key: string): Promise<Buffer | null> {
  if (!privateStorageConfigured) return null;

  return readPrivateObject(key);
}

/**
 * Stores a rendered PDF. Answers whether it landed; no caller has to care.
 *
 * Only a **final** document is stored. A draft invoice has no issue date and
 * is still being edited, so its bytes are not a document — they are a preview,
 * and preserving a preview in the archive that holds what customers were sent
 * is how the two stop being distinguishable.
 */
export async function writeDocumentPdf(
  document: StorableDocument,
  key: string,
  pdf: Buffer,
): Promise<boolean> {
  if (!privateStorageConfigured) return false;
  if (!isFinal(document)) return false;

  return writePrivateObject({ key, body: pdf, contentType: 'application/pdf' });
}

function isFinal(document: StorableDocument): boolean {
  // A receipt exists only for a payment that succeeded; there is no draft one.
  return document.kind === 'receipt' || document.issuedAt !== null;
}

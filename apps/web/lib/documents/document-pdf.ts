import 'server-only';

import { renderPdf } from './pdf';
import {
  documentKeyFor,
  readDocumentPdf,
  writeDocumentPdf,
  type StorableDocument,
} from './pdf-store';

/**
 * A document as PDF bytes — from the bucket when it has been rendered before,
 * drawn by `renderPdf` when it has not.
 *
 * This is the only thing that should call `renderPdf` on a request path.
 * Everything a customer or an admin can click goes through here, so each
 * distinct version of a document is drawn once and read back afterwards.
 *
 * **The contract of `renderPdf` is preserved exactly.** A document the PDF
 * fonts cannot draw still comes back `{ ok: false, reason }`, and the caller
 * still serves HTML with a header saying so — the cache in front must never
 * turn that into an error.
 */
export type DocumentPdfResult =
  | { ok: true; pdf: Buffer; source: 'store' | 'render' }
  | { ok: false; reason: string };

export async function documentPdf(
  document: StorableDocument,
  html: string,
): Promise<DocumentPdfResult> {
  const key = documentKeyFor(document, html);

  const stored = await readDocumentPdf(key);

  if (stored) return { ok: true, pdf: stored, source: 'store' };

  const rendered = await renderPdf(document);

  if (!rendered.ok) return rendered;

  /*
   * Awaited, not left running. It is one small PUT, and a write that outlives
   * the response is a write nobody finds out about when it fails.
   * `writeDocumentPdf` never throws.
   */
  await writeDocumentPdf(document, key, rendered.pdf);

  return { ok: true, pdf: rendered.pdf, source: 'render' };
}

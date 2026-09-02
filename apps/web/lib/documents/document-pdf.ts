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
 * from the engine when it has not.
 *
 * This is the only thing that should call `renderPdf` on a request path.
 * Everything a customer or an admin can click goes through here, so the
 * browser runs once per distinct version of a document and never again.
 *
 * **The contract of `renderPdf` is preserved exactly.** A missing engine still
 * comes back `{ ok: false, reason }` and the caller still serves HTML with a
 * header saying so. Adding a cache in front of a renderer that may be absent
 * must not turn "no engine, here is the HTML" into an error, because that
 * fallback is what makes the whole document layer deployable before the engine
 * question is settled.
 */
export type DocumentPdfResult =
  | {
      ok: true;
      pdf: Buffer;
      source: 'store' | 'render';
      /** See `pdf-result.ts`. Set means served, deliberately not stored. */
      degraded?: string;
    }
  | { ok: false; reason: string };

export async function documentPdf(
  document: StorableDocument,
  html: string,
): Promise<DocumentPdfResult> {
  const key = documentKeyFor(document, html);

  const stored = await readDocumentPdf(key);

  if (stored) return { ok: true, pdf: stored, source: 'store' };

  const rendered = await renderPdf(html);

  if (!rendered.ok) return rendered;

  /*
   * **A degraded render is served but never stored.** The key is the
   * document's identity, so an archived bad render is the answer to that
   * document forever — an invoice permanently set in the wrong typeface, with
   * its figures out of column, and no way to notice from the outside. Handing
   * this one to the person who asked and rendering again next time is the
   * cheap half of that trade.
   */
  if (rendered.degraded) {
    console.warn(`[documents] ${key} not stored — ${rendered.degraded}`);

    return {
      ok: true,
      pdf: rendered.pdf,
      source: 'render',
      degraded: rendered.degraded,
    };
  }

  /*
   * Awaited, not left running. It is one small PUT after a render that already
   * cost seconds, and a write that outlives the response is a write nobody
   * finds out about when it fails. `writeDocumentPdf` never throws.
   */
  await writeDocumentPdf(document, key, rendered.pdf);

  return { ok: true, pdf: rendered.pdf, source: 'render' };
}

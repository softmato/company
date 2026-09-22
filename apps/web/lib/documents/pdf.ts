/**
 * Document → PDF, drawn directly with pdf-lib. No browser anywhere.
 *
 * This used to print the HTML sheet through Chrome: a local binary, or 65 MB
 * of Chromium unpacked into `/tmp` on Vercel, seconds per render, and web
 * fonts that could fail to arrive. Now the PDF is drawn from the same
 * `InvoiceDocument` / `ReceiptDocument` value the screen renders — every
 * figure and every fixed phrase comes from one place (`types.ts`,
 * `wording.ts`), so the two can differ in how they look, never in what they
 * say. It runs in milliseconds, in any runtime, with nothing to install.
 *
 * **`ok: false` is still a normal answer, never an exception.** The one case
 * left is text the standard PDF fonts cannot draw (see `pdf-sheet.ts`); the
 * caller then serves the HTML with a header saying so, which a browser prints
 * perfectly well. Nothing here may turn that into an error.
 *
 * No `server-only` marker: `pnpm doc:preview -- --pdf` renders documents with
 * no running Next server.
 */
import { drawInvoice } from './pdf-invoice';
import { drawReceipt } from './pdf-receipt';
import type { PdfResult } from './pdf-result';
import { UndrawableText } from './pdf-sheet';
import type { InvoiceDocument, ReceiptDocument } from './types';

export type { PdfResult } from './pdf-result';

/**
 * Part of every stored PDF's key (`pdf-store.ts`). Bump it when the drawing
 * changes, so stored copies are re-rendered rather than served in the old
 * layout forever.
 */
export const PDF_LAYOUT = 'pdf-lib/1';

export async function renderPdf(
  document: InvoiceDocument | ReceiptDocument,
): Promise<PdfResult> {
  try {
    const bytes =
      document.kind === 'invoice'
        ? await drawInvoice(document)
        : await drawReceipt(document);

    return { ok: true, pdf: Buffer.from(bytes) };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof UndrawableText
          ? error.message
          : `PDF render failed: ${String(error)}`,
    };
  }
}

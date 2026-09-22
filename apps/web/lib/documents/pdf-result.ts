/**
 * What `renderPdf` answers.
 *
 * **`ok: false` is a normal answer, not an exception.** Text the standard PDF
 * fonts cannot draw is a supported state: the caller serves the HTML with a
 * header saying so, and a browser prints that perfectly well.
 */
export type PdfResult =
  | { ok: true; pdf: Buffer }
  | { ok: false; reason: string };

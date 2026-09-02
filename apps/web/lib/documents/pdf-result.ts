/**
 * What a PDF engine answers, shared by all of them.
 *
 * Its own module so the two engines can be imported independently of each
 * other — the serverless one is 65 MB of Linux Chromium and must stay behind a
 * dynamic import, which it cannot be if it also owns the type.
 *
 * **`ok: false` is a normal answer, not an exception.** No engine configured
 * is a supported state: the caller serves the HTML with a header saying so,
 * and a browser prints that perfectly well.
 */
export type PdfResult =
  | {
      ok: true;
      pdf: Buffer;
      /**
       * Set when the PDF was produced but is not the document as designed —
       * today, when the web fonts did not arrive and the text was laid out in
       * a fallback face.
       *
       * It is still returned: a customer asking for their invoice should get
       * one. It is **not stored**, because a cache keyed on the document
       * would then serve the wrong typeface forever, and the mono face is the
       * only thing keeping the figures in column.
       */
      degraded?: string;
    }
  | { ok: false; reason: string };

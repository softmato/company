/**
 * HTML → PDF, behind one function.
 *
 * **The seam exists because the engine is a deployment decision, not a
 * rendering one.** Producing a PDF from HTML means running a browser
 * somewhere, and where it runs depends on where this is deployed — none of
 * which should reach the components that draw an invoice. They render HTML;
 * this turns HTML into paper.
 *
 * Two engines, and the order between them is deliberate:
 *
 * 1. **A Chrome or Edge on the machine** (`pdf-chrome.ts`). Every developer
 *    has one, and so does any container built on a Chrome image. `CHROME_PATH`
 *    or a standard install location is the whole configuration, and there is
 *    no dependency involved.
 * 2. **Chromium bundled into the deployment** (`pdf-chromium.ts`). Vercel's
 *    servers have no browser, which is what this is for. It is a Linux x64
 *    build, so on a developer's Mac or Windows box it correctly declines and
 *    the first engine is the only one that ever runs.
 *
 * A local binary wins when there is one. It starts faster than unpacking 65 MB
 * of Chromium into `/tmp`, and on the machines that have one it is also the
 * engine that has been rendering these documents all along.
 *
 * **With neither, `renderPdf` says so plainly and never throws.** The caller
 * serves the HTML instead, which still prints correctly from a browser — a
 * worse experience, not a broken one. That fallback is load-bearing: it is
 * what let the whole document layer ship and be tested before this file knew
 * how to run a browser in production, and nothing here may quietly turn it
 * into an error.
 *
 * No `server-only` marker, unlike its neighbours: `node:child_process` is a
 * harder guard than the marker is, and leaving the marker off is what lets
 * `pnpm doc:preview -- --pdf` render a document with no running Next server,
 * which is the whole point of that tool.
 */
import { chromeBinary, renderWithChrome } from './pdf-chrome';
import type { PdfResult } from './pdf-result';

export type { PdfResult } from './pdf-result';

export async function renderPdf(html: string): Promise<PdfResult> {
  const chrome = chromeBinary();

  if (chrome) return renderWithChrome(html, chrome);

  /*
   * Loaded only when it is about to be used. A static import would pull
   * `puppeteer-core` and 65 MB of Linux Chromium into every process that
   * touches a document — including the preview script, which needs neither.
   */
  const { chromiumUsable, renderWithBundledChromium } =
    await import('./pdf-chromium');

  if (!chromiumUsable()) {
    return {
      ok: false,
      reason:
        'No PDF engine available. Set CHROME_PATH to a Chrome or Edge binary, ' +
        'or install one at a standard location — the bundled Chromium is a ' +
        'Linux x64 build and cannot run here.',
    };
  }

  try {
    return await renderWithBundledChromium(html);
  } catch (error) {
    // The bundled engine talks over CDP and unpacks a binary, either of which
    // can fail in ways `renderWithChrome` cannot. Reported the same way as
    // every other engine problem, so the caller's fallback still applies.
    return { ok: false, reason: `PDF render failed: ${String(error)}` };
  }
}

/**
 * True when a document can be turned into a PDF **on this machine, now**.
 *
 * Only `pnpm doc:preview` asks, and what it wants to know is whether to print
 * sample documents to disk — a question about the local machine, which is why
 * this stays synchronous and only looks for a local binary. It is not the
 * right question for a request path: there, `renderPdf` is called and its
 * answer is the fallback decision.
 */
export function pdfAvailable(): boolean {
  return chromeBinary() !== null;
}

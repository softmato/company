import type { PdfResult } from './pdf-result';

/**
 * Chromium shipped inside the deployment bundle, driven over CDP.
 *
 * **This exists because Vercel's servers have no browser on them.** Everything
 * upstream of the engine was built and tested against a Chrome that happens to
 * be installed on a developer's machine; in production there is none, and
 * without this the download of an invoice hands the customer a web page.
 *
 * `@sparticuz/chromium` is a Chromium built for Amazon Linux and compressed
 * into the package — around 65 MB of the function's size budget, extracted
 * into `/tmp` on the first call of a container and reused by every call after.
 * That extraction is most of a cold start, which is the reason documents are
 * rendered once and stored (`pdf-store.ts`) rather than on every download.
 *
 * **Linux x64 only, and it says so rather than crashing.** The binary is built
 * for Lambda; asking for it on a Mac or on Windows produces a confusing
 * failure deep inside an unpack, so the check is here and the answer is the
 * ordinary `ok: false` every other absent-engine case gives.
 *
 * Imported dynamically by `pdf.ts`, never statically: a machine with a real
 * Chrome must not pay to load any of this, and `pnpm doc:preview` must not
 * pull it in at all.
 */

/** Chrome's own print-to-PDF is a Linux binary; there is no Windows build. */
export function chromiumUsable(): boolean {
  return process.platform === 'linux' && process.arch === 'x64';
}

export async function renderWithBundledChromium(
  html: string,
): Promise<PdfResult> {
  const [{ default: chromium }, puppeteer] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);

  /*
   * No WebGL. An invoice is text and rules; leaving the graphics stack on
   * costs startup time to initialise a software renderer nothing here uses.
   */
  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();

    /*
     * `setContent` rather than navigating to a data: or file: URL — the markup
     * is already in memory and writing it to disk to read it straight back is
     * work with no purpose.
     *
     * `load` waits for the Google Fonts stylesheet. It does **not** wait for
     * the font files that stylesheet then asks for, which is what
     * `document.fonts.ready` below is for: printing before those arrive
     * produces a document set in the fallback stack and loses the tabular
     * alignment of the figures — the one thing the mono face is there for.
     */
    await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });

    const fontsLoaded = await fontsArrived(page);

    const pdf = Buffer.from(
      await page.pdf({
        /*
         * The document's own `@page { size: A4 | A5; margin: 0 }` decides the
         * paper — an invoice is A4 and a receipt A5, and that difference is
         * what tells the two apart across a desk. Setting a format here would
         * be a second opinion about the same thing, free to disagree with the
         * stylesheet the browser print dialog obeys.
         */
        preferCSSPageSize: true,
        /*
         * Renders what the CSS says. Today the document is black ink on white
         * paper and the only tinted block is screen-only, so this changes
         * nothing; it is set so that a tint added later prints rather than
         * silently disappearing on this engine alone.
         */
        printBackground: true,
      }),
    );

    return fontsLoaded
      ? { ok: true, pdf }
      : {
          ok: true,
          pdf,
          degraded: 'Web fonts did not load; the document is set in a fallback face.',
        };
  } finally {
    // Always. A browser left running in a warm container is a leak that
    // survives every subsequent invocation on that instance.
    await browser.close();
  }
}

/**
 * Whether the faces the document asks for actually arrived.
 *
 * `document.fonts.ready` alone is not the answer: it resolves once loading has
 * *settled*, including settling on failure. What matters is whether any face
 * ended up loaded, because an empty font set means the stylesheet never
 * arrived and every glyph on the page came from somewhere else.
 */
async function fontsArrived(page: {
  evaluate: <T>(fn: () => Promise<T> | T) => Promise<T>;
}): Promise<boolean> {
  try {
    return await page.evaluate(async () => {
      await document.fonts.ready;

      return Array.from(document.fonts).some(
        (face) => face.status === 'loaded',
      );
    });
  } catch {
    // A page that cannot be questioned is not evidence that fonts failed.
    return true;
  }
}

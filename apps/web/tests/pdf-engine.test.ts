/**
 * Which engine runs, and what happens when none can.
 *
 * The order matters — a machine with a real Chrome must use it rather than
 * unpacking 65 MB of Linux Chromium — but the case worth pinning is the last
 * one. **No engine is a supported state, not an error.** Every caller relies
 * on `renderPdf` answering `{ ok: false, reason }` so it can serve the HTML
 * with a header saying so, and an engine addition that turned that into a
 * throw would take out an invoice download on a host where the binary is
 * simply missing.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

const chromeBinary = vi.fn();
const renderWithChrome = vi.fn();
const chromiumUsable = vi.fn();
const renderWithBundledChromium = vi.fn();

vi.mock('@/lib/documents/pdf-chrome', () => ({
  chromeBinary: () => chromeBinary(),
  renderWithChrome: (html: string, chrome: string) =>
    renderWithChrome(html, chrome),
}));

vi.mock('@/lib/documents/pdf-chromium', () => ({
  chromiumUsable: () => chromiumUsable(),
  renderWithBundledChromium: (html: string) => renderWithBundledChromium(html),
}));

const { renderPdf, pdfAvailable } = await import('@/lib/documents/pdf');

beforeEach(() => {
  chromeBinary.mockReset();
  renderWithChrome.mockReset();
  chromiumUsable.mockReset();
  renderWithBundledChromium.mockReset();
});

describe('renderPdf', () => {
  test('uses a local binary when the machine has one', async () => {
    chromeBinary.mockReturnValue('/usr/bin/google-chrome');
    renderWithChrome.mockResolvedValue({ ok: true, pdf: Buffer.from('%PDF-') });

    await expect(renderPdf('<p>a</p>')).resolves.toEqual({
      ok: true,
      pdf: Buffer.from('%PDF-'),
    });

    expect(renderWithChrome).toHaveBeenCalledWith(
      '<p>a</p>',
      '/usr/bin/google-chrome',
    );
    expect(renderWithBundledChromium).not.toHaveBeenCalled();
  });

  test('falls to the bundled Chromium where there is no binary — this is Vercel', async () => {
    chromeBinary.mockReturnValue(null);
    chromiumUsable.mockReturnValue(true);
    renderWithBundledChromium.mockResolvedValue({
      ok: true,
      pdf: Buffer.from('%PDF-'),
    });

    await expect(renderPdf('<p>a</p>')).resolves.toEqual({
      ok: true,
      pdf: Buffer.from('%PDF-'),
    });
  });

  test('says so rather than throwing when neither engine can run', async () => {
    chromeBinary.mockReturnValue(null);
    chromiumUsable.mockReturnValue(false);

    const result = await renderPdf('<p>a</p>');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/CHROME_PATH/);
    expect(renderWithBundledChromium).not.toHaveBeenCalled();
  });

  test('a bundled engine that throws is reported, not propagated', async () => {
    chromeBinary.mockReturnValue(null);
    chromiumUsable.mockReturnValue(true);
    renderWithBundledChromium.mockRejectedValue(new Error('CDP hung up'));

    const result = await renderPdf('<p>a</p>');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain('CDP hung up');
  });

  test('carries a degraded render through instead of discarding it', async () => {
    chromeBinary.mockReturnValue(null);
    chromiumUsable.mockReturnValue(true);
    renderWithBundledChromium.mockResolvedValue({
      ok: true,
      pdf: Buffer.from('%PDF-'),
      degraded:
        'Web fonts did not load; the document is set in a fallback face.',
    });

    const result = await renderPdf('<p>a</p>');

    expect(result.ok && result.degraded).toBeTruthy();
  });
});

describe('pdfAvailable', () => {
  test('answers about this machine, which is what doc:preview asks', () => {
    chromeBinary.mockReturnValue('/usr/bin/google-chrome');
    expect(pdfAvailable()).toBe(true);

    chromeBinary.mockReturnValue(null);
    expect(pdfAvailable()).toBe(false);
  });
});

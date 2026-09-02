import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PdfResult } from './pdf-result';

/**
 * A Chrome or Edge already installed on the machine, driven by its own
 * `--print-to-pdf`.
 *
 * This is the engine on every developer's laptop and in any container built on
 * a Chrome image, and it needs no dependency and no protocol client: write the
 * HTML to a temp file, ask Chrome to print it, read the result back. It is
 * also what `pnpm doc:preview -- --pdf` uses, which is why nothing in this
 * file is `server-only` and why the serverless engine lives in its own module
 * behind a dynamic import — the preview tool must not pull 65 MB of Linux
 * Chromium onto a Mac to render a sample invoice.
 *
 * One process launch per document, rather than holding a browser open.
 * Documents are produced one at a time, when a person clicks or a payment
 * settles, and a long-lived browser is a long-lived thing to leak.
 */

/** The binary, or `null` when this machine has none. */
export function chromeBinary(): string | null {
  const configured = process.env['CHROME_PATH'];

  if (configured && existsSync(configured)) return configured;

  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  return candidates.find((path) => existsSync(path)) ?? null;
}

export async function renderWithChrome(
  html: string,
  chrome: string,
): Promise<PdfResult> {
  const dir = await mkdtemp(join(tmpdir(), 'softmato-doc-'));
  const source = join(dir, 'document.html');
  const target = join(dir, 'document.pdf');

  try {
    await writeFile(source, html, 'utf8');

    await run(chrome, target, [
      '--headless=new',
      '--disable-gpu',
      // Sandboxing is off only because this renders our own markup, generated
      // by us, from our own database — there is no third-party HTML here. If
      // that ever stops being true this line has to go.
      '--no-sandbox',
      '--no-pdf-header-footer',
      // Not optional. Without it Chrome stamps the file path and the date into
      // the margins, and an invoice with a `file:///` URL across its footer
      // does not look like an invoice.
      '--print-to-pdf-no-header',
      `--print-to-pdf=${target}`,
      // Fonts are fetched from Google; without a moment to settle, the first
      // render can print in the fallback stack.
      '--virtual-time-budget=4000',
      `file://${source.replace(/\\/g, '/')}`,
    ]);

    if (!existsSync(target)) {
      return { ok: false, reason: 'Chrome exited without producing a PDF.' };
    }

    return { ok: true, pdf: await readFile(target) };
  } catch (error) {
    return { ok: false, reason: `PDF render failed: ${String(error)}` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * One process, with a timeout and no shell.
 *
 * A non-zero exit is not treated as failure when the PDF is on disk: Chrome
 * reports GPU and profile complaints through its exit code even when the print
 * succeeded, and the artefact is the only evidence worth trusting.
 */
function run(command: string, target: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Chrome did not finish within 30s'));
    }, 30_000);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);

      if (code === 0 || existsSync(target)) resolve();
      else reject(new Error(`Chrome exited with code ${code}`));
    });
  });
}

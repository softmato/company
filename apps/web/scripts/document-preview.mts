/**
 * Writes the sample invoices and receipts to HTML so the layout can be worked
 * on in a browser.
 *
 *     pnpm doc:preview                       # into .preview/documents
 *     pnpm doc:preview -- --out /tmp/docs
 *     pnpm doc:preview -- --pdf              # also render each one to PDF
 *
 * No database, no admin session, no payment. The design loop for a document
 * should not require a customer to have paid something, and until this existed
 * it did.
 *
 * The samples are in `apps/web/lib/documents/samples.ts` and are invented on
 * purpose — a preview built from a real customer's invoice would be real
 * financial data sitting in a scratch directory.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  SAMPLE_INVOICE,
  SAMPLE_INVOICE_PART_PAID,
  SAMPLE_INVOICE_VOID,
  SAMPLE_RECEIPT,
  SAMPLE_RECEIPT_PARTIAL,
} from '../lib/documents/samples';
import { invoiceHtml, receiptHtml } from '../lib/documents/render-html';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const out = resolve(flag('--out') ?? '.preview/documents');
const alsoPdf = argv.includes('--pdf');

await mkdir(out, { recursive: true });

const documents = [
  { name: 'invoice-unpaid', html: invoiceHtml(SAMPLE_INVOICE) },
  { name: 'invoice-part-paid', html: invoiceHtml(SAMPLE_INVOICE_PART_PAID) },
  { name: 'invoice-void', html: invoiceHtml(SAMPLE_INVOICE_VOID) },
  { name: 'receipt-paid', html: receiptHtml(SAMPLE_RECEIPT) },
  { name: 'receipt-partial', html: receiptHtml(SAMPLE_RECEIPT_PARTIAL) },
];

for (const { name, html } of documents) {
  const file = resolve(out, `${name}.html`);

  await writeFile(file, html, 'utf8');
  console.log(`  ${file}`);
}

if (alsoPdf) {
  // Imported lazily: it is `server-only` in spirit and pulls in child_process,
  // which the HTML path has no business needing.
  const { renderPdf, pdfAvailable } = await import('../lib/documents/pdf');

  if (!pdfAvailable()) {
    console.error(
      '\nNo Chrome or Edge found. Set CHROME_PATH to render PDFs; the HTML ' +
        'above prints correctly from a browser in the meantime.',
    );
    process.exit(1);
  }

  console.log('');

  for (const { name, html } of documents) {
    const result = await renderPdf(html);

    if (!result.ok) {
      console.error(`  ${name}.pdf — ${result.reason}`);
      continue;
    }

    const file = resolve(out, `${name}.pdf`);

    await writeFile(file, result.pdf);
    console.log(`  ${file}  (${(result.pdf.length / 1024).toFixed(0)} KB)`);
  }
}

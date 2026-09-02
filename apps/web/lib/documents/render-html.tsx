/*
 * `react-dom/server.edge`, not `react-dom/server`. Next refuses the latter
 * anywhere the App Router can reach — it is how people accidentally ship a
 * second renderer into a component — and an App Route importing it fails to
 * compile with "You're importing a component that imports react-dom/server".
 * The edge entry exports the same `renderToStaticMarkup` and is permitted.
 */
import { renderToStaticMarkup } from 'react-dom/server.edge';

import { InvoiceSheet } from '@/components/documents/invoice-sheet';
import { ReceiptSheet } from '@/components/documents/receipt-sheet';
import { SHEET_STYLES } from '@/components/documents/sheet-styles';

import type { InvoiceDocument, ReceiptDocument } from './types';

/**
 * A document → one self-contained HTML file.
 *
 * This is what the PDF engine is handed and what an "email me a copy" fallback
 * would attach. It renders the **same components** the admin page renders, so
 * there is exactly one invoice layout in this codebase — a PDF built from a
 * parallel template is a PDF that drifts from the screen, and nobody notices
 * until a customer quotes a figure that is not on the page you are looking at.
 *
 * **Nothing is fetched at print time except fonts.** No stylesheet link, no
 * script, no image URL: the CSS is inlined, so the file renders identically on
 * a machine with no access to this app. That matters because the thing
 * rendering it is a headless browser running somewhere with no session and no
 * business being able to reach an authenticated route.
 *
 * `renderToStaticMarkup` rather than `renderToString`: there is no hydration
 * and no client, so the React marker attributes would be bytes of noise in an
 * archived document.
 *
 * Deliberately **not** `server-only`. It reads no database and holds no
 * secret — it is a pure function from a document value to a string, and
 * marking it server-only would make the layout untestable and unpreviewable
 * for no gain. The modules that fetch the document are the server-only ones.
 */

/** Google Fonts, with a real fallback stack behind each face in the CSS. */
const FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=DM+Sans:wght@400;500;600;700' +
  '&family=Inter:wght@400;500;600' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
  '&display=swap';

export function invoiceHtml(document: InvoiceDocument): string {
  return page(
    `Invoice ${document.invoiceNo}`,
    renderToStaticMarkup(<InvoiceSheet document={document} />),
    'A4',
  );
}

export function receiptHtml(document: ReceiptDocument): string {
  return page(
    `Receipt ${document.receiptNo}`,
    renderToStaticMarkup(<ReceiptSheet document={document} />),
    /*
     * A5, matching the sheet's own 148mm width. Printing the receipt onto A4
     * would work, but it would arrive as a small document marooned on a large
     * page — and the size difference from the invoice is exactly what tells
     * the two apart before either is read (spec §6).
     */
    'A5',
  );
}

/**
 * The wrapper.
 *
 * `@page` sets the paper and kills the browser's default header and footer —
 * without it a printed invoice carries the URL and the date in the margins,
 * which on a document sent to a customer looks like a screenshot of a web page
 * rather than an invoice.
 */
function page(title: string, body: string, size: 'A4' | 'A5'): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
  @page { size: ${size}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
${SHEET_STYLES}
</style>
</head>
<body class="sheet-root">
${body}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

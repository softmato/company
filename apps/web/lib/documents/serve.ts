/**
 * An invoice or receipt as an HTTP response — HTML, or PDF when asked.
 *
 * **Authorisation is the caller's job, and has to happen first.** The admin
 * route checks the admin session; the portal route checks the client session
 * and that the document is theirs. This only renders.
 *
 * **The PDF is rendered from the same HTML the browser gets.** One layout, one
 * source of truth (`lib/documents/render-html.tsx`); the two formats cannot
 * disagree about what the invoice says.
 *
 * **`format=pdf` falls back to HTML when no engine is configured**, with a
 * header saying so, rather than failing. A browser prints the HTML to PDF
 * perfectly well; refusing to serve anything would be a worse answer to
 * "download this invoice" than serving the document.
 */
import 'server-only';

import { buildInvoiceDocument } from './invoice-document';
import { buildReceiptDocument } from './receipt-document';
import { documentPdf } from './document-pdf';
import type { StorableDocument } from './pdf-store';
import { invoiceHtml, receiptHtml } from './render-html';

export type DocumentKind = 'invoice' | 'receipt';

export function isDocumentKind(value: string): value is DocumentKind {
  return value === 'invoice' || value === 'receipt';
}

/** Null when there is no such document. */
export async function documentResponse(
  kind: DocumentKind,
  reference: string,
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const wantsPdf = url.searchParams.get('format') === 'pdf';
  const autoPrint = url.searchParams.get('print') === '1';

  const rendered = await render(kind, reference);
  if (!rendered) return null;

  if (!wantsPdf) {
    return new Response(withAutoPrint(rendered.html, autoPrint), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  const pdf = await documentPdf(rendered.document, rendered.html);

  if (!pdf.ok) {
    console.warn(`[documents] PDF unavailable — ${pdf.reason}`);

    return new Response(withAutoPrint(rendered.html, true), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        // Named so the client can tell a deliberate fallback from a PDF that
        // silently came back as a web page.
        'x-softmato-pdf-fallback': pdf.reason,
      },
    });
  }

  return new Response(new Uint8Array(pdf.pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${rendered.filename}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}

/**
 * The document is carried alongside its HTML because the PDF path needs both:
 * the markup to render or fall back to, and the document itself to address the
 * stored copy in the private bucket.
 */
async function render(
  kind: DocumentKind,
  reference: string,
): Promise<{
  document: StorableDocument;
  html: string;
  filename: string;
} | null> {
  if (kind === 'invoice') {
    const document = await buildInvoiceDocument(reference);

    if (!document) return null;

    return {
      document,
      html: invoiceHtml(document),
      filename: safeFilename(document.invoiceNo),
    };
  }

  const document = await buildReceiptDocument(reference);

  if (!document) return null;

  return {
    document,
    html: receiptHtml(document),
    filename: safeFilename(`Receipt-${document.receiptNo}`),
  };
}

/**
 * Opens the print dialog once the fonts have loaded.
 *
 * `document.fonts.ready` rather than `onload`: printing before DM Sans and
 * Plex Mono arrive produces a document set in the fallback stack, and the
 * figures lose their tabular alignment — which is the one thing the mono face
 * is there for.
 */
function withAutoPrint(html: string, enabled: boolean): string {
  if (!enabled) return html;

  return html.replace(
    '</body>',
    '<script>document.fonts.ready.then(function(){window.print()});</script></body>',
  );
}

/** `INV-2083/84-000010` → `INV-2083-84-000010`. A slash is a path. */
function safeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-');
}

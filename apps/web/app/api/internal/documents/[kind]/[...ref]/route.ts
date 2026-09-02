/**
 * `/api/internal/documents/invoice/INV-2083/84-000010?format=pdf`
 *
 * Serves an invoice or a receipt as a standalone HTML file or as a PDF. Admin
 * only — these are somebody's financial records, and the route is behind the
 * same session-plus-MFA check the admin pages are.
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
import { auth } from '@/lib/auth';
import { buildInvoiceDocument } from '@/lib/documents/invoice-document';
import { buildReceiptDocument } from '@/lib/documents/receipt-document';
import { documentPdf } from '@/lib/documents/document-pdf';
import type { StorableDocument } from '@/lib/documents/pdf-store';
import { invoiceHtml, receiptHtml } from '@/lib/documents/render-html';

export const dynamic = 'force-dynamic';

/**
 * Chrome may launch on this request; the default 15s is not enough on a cold
 * host. A document already rendered into the private bucket comes back as a
 * read — this budget is for the first render of a given version.
 */
export const maxDuration = 60;

const UNAUTHORIZED = Response.json(
  { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
  { status: 401 },
);

export async function GET(
  request: Request,
  context: RouteContext<'/api/internal/documents/[kind]/[...ref]'>,
) {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) return UNAUTHORIZED;

  const { kind, ref } = await context.params;
  // The number is one identifier split across segments by its own slash.
  const reference = ref.map(decodeURIComponent).join('/');

  const url = new URL(request.url);
  const wantsPdf = url.searchParams.get('format') === 'pdf';
  const autoPrint = url.searchParams.get('print') === '1';

  const rendered = await render(kind, reference);

  if (!rendered) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'No such document.' } },
      { status: 404 },
    );
  }

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
  kind: string,
  reference: string,
): Promise<{ document: StorableDocument; html: string; filename: string } | null> {
  if (kind === 'invoice') {
    const document = await buildInvoiceDocument(reference);

    if (!document) return null;

    return {
      document,
      html: invoiceHtml(document),
      filename: safeFilename(document.invoiceNo),
    };
  }

  if (kind === 'receipt') {
    const document = await buildReceiptDocument(reference);

    if (!document) return null;

    return {
      document,
      html: receiptHtml(document),
      filename: safeFilename(`Receipt-${document.receiptNo}`),
    };
  }

  return null;
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

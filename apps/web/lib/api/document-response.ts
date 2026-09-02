import 'server-only';

import { documentPdf } from '@/lib/documents/document-pdf';
import type { StorableDocument } from '@/lib/documents/pdf-store';
import { invoiceHtml, receiptHtml } from '@/lib/documents/render-html';

/**
 * The `?format=` half of the two document endpoints, in one place.
 *
 * Both `/v1/invoices/{no}` and `/v1/receipts/{no}` offer the same
 * three: JSON to render your own screen from, HTML to embed or print, and PDF
 * to hand a customer. Written once so the two cannot answer `format=pdf`
 * differently.
 *
 * **A missing PDF engine falls back to HTML rather than failing.** The
 * fallback is announced in a header, not swallowed: a consumer that asked for
 * a PDF and got a web page must be able to tell, or it will attach an HTML
 * file to an email with a `.pdf` name on it.
 *
 * It takes the document rather than a string of HTML because the PDF comes
 * from `documentPdf`, which reads the stored copy before it renders one, and
 * the stored copy is addressed by what the document *is*. Handing it only the
 * markup would leave both routes deciding for themselves which layout and
 * which filename belong to which kind — twice, identically, until they were
 * edited apart.
 */
export type DocumentFormat = 'json' | 'html' | 'pdf';

/** Anything unrecognised is JSON — the default a consumer gets for asking badly. */
export function documentFormat(request: Request): DocumentFormat {
  const raw = new URL(request.url).searchParams.get('format');

  return raw === 'pdf' || raw === 'html' ? raw : 'json';
}

export async function documentFile(
  format: 'html' | 'pdf',
  document: StorableDocument,
): Promise<Response> {
  const html =
    document.kind === 'invoice' ? invoiceHtml(document) : receiptHtml(document);
  const filename =
    document.kind === 'invoice'
      ? document.invoiceNo
      : `Receipt-${document.receiptNo}`;

  if (format === 'html') {
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  const pdf = await documentPdf(document, html);

  if (!pdf.ok) {
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-softmato-pdf-fallback': pdf.reason,
      },
    });
  }

  return new Response(new Uint8Array(pdf.pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${safeFilename(filename)}.pdf"`,
      'cache-control': 'no-store',
    },
  });
}

/** `INV-2083/84-000010` → `INV-2083-84-000010`. A slash is not a filename. */
export function safeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-');
}

/**
 * Rebuilds the identifier a catch-all route split on its own slash.
 *
 * `INV-2083/84-000010` is one number and two path segments. Joining rather
 * than percent-encoding keeps the URL readable and avoids depending on every
 * layer between the browser and the router agreeing not to decode a `%2F`.
 */
export function joinReference(segments: string[]): string {
  return segments.map(decodeURIComponent).join('/');
}

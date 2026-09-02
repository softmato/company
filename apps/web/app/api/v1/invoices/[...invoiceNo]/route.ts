/**
 * `GET /v1/invoices/{invoice_no}` — one invoice, as JSON, HTML or PDF.
 *
 * This is what a SaaS calls to show a customer their own billing history in
 * its own settings screen: `?format=json` (the default) to render a list from,
 * `?format=pdf` to hand the customer a file.
 *
 * **Scoped to the caller.** `application.id` goes into the `WHERE` clause, so
 * another SaaS's invoice comes back `404` rather than `403` — the same answer
 * as an invoice that does not exist, which is the right amount to tell someone
 * with no business knowing either way.
 *
 * A catch-all segment because `INV-2083/84-000010` contains a slash.
 */
import { readEndpoint } from '@/lib/api/route';
import {
  documentFile,
  documentFormat,
  joinReference,
} from '@/lib/api/document-response';
import { serializeInvoiceDocument } from '@/lib/api/serialize-document';
import { buildInvoiceDocument } from '@/lib/documents/invoice-document';
import { env } from '@/lib/env';
import { apiError } from '@/lib/api/respond';
import { PaymentError } from '@softmato/payment-core';

export const dynamic = 'force-dynamic';

/**
 * A PDF may launch a browser; the default 15s is not enough on a cold host.
 * Once the document has been rendered into the bucket the request is a read
 * and returns in milliseconds — this budget is for the first one.
 */
export const maxDuration = 60;

export const GET = readEndpoint<{ invoiceNo: string[] }>(
  'invoice:read',
  async ({ application, params, request, requestId }) => {
    const invoiceNo = joinReference(params.invoiceNo);

    const document = await buildInvoiceDocument(invoiceNo, application.id);

    if (!document) {
      return apiError(
        new PaymentError('RESOURCE_NOT_FOUND', 'No such invoice.', {
          invoice_id: invoiceNo,
        }),
        requestId,
      );
    }

    const format = documentFormat(request);

    if (format !== 'json') {
      return documentFile(format, document);
    }

    return {
      body: serializeInvoiceDocument(document, documentUrl(invoiceNo)),
    };
  },
);

/** Absolute, so a consumer can store it and fetch it later without guessing. */
function documentUrl(invoiceNo: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');

  return `${base}/api/v1/invoices/${invoiceNo}`;
}

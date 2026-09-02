import 'server-only';
import { after } from 'next/server';

import { privateStorageConfigured } from '@/lib/storage/private-client';

import { documentPdf } from './document-pdf';
import { buildInvoiceDocument } from './invoice-document';
import { invoiceHtml } from './render-html';

/**
 * Renders an invoice's PDF into the bucket once the response has gone out.
 *
 * This is the "store at issue" half. Without it the first person to click
 * download pays for the browser launch — which on a cold serverless host is
 * several seconds, and which happens to be the customer rather than us.
 * Rendering at issue time moves that cost onto a moment when nobody is
 * waiting, and the document is on the shelf before it is ever asked for.
 *
 * **`after()`, so the API call does not wait for it.** `POST /v1/invoices` is
 * a server-to-server call in the middle of somebody's signup flow; hanging it
 * on a headless browser would make our slowest operation part of their
 * fastest path. The callback runs once the response has been sent, and after
 * the transaction that created the invoice has committed — which also means a
 * rolled-back invoice simply is not found here, and nothing is stored.
 *
 * **Nothing it does can fail the request.** It is a warm-up: every outcome —
 * no bucket, no engine, no such invoice, R2 refusing — leaves the system in
 * the state it was in before, where the document is rendered on demand.
 */
export function prerenderInvoicePdf(invoiceNo: string): void {
  // With nowhere to put the result, rendering it is pure cost. The engine is
  // allowed to be missing; the bucket is the thing that makes this worth doing.
  if (!privateStorageConfigured) return;

  try {
    after(async () => {
      try {
        const document = await buildInvoiceDocument(invoiceNo);

        if (!document) return;

        const result = await documentPdf(document, invoiceHtml(document));

        if (!result.ok) {
          console.info(`[documents] ${invoiceNo} not pre-rendered — ${result.reason}`);
        }
      } catch (error) {
        console.warn(`[documents] ${invoiceNo} not pre-rendered —`, error);
      }
    });
  } catch (error) {
    // `after` throws when called outside a request scope. That is a wiring
    // mistake, not a reason to fail an invoice that has already been created.
    console.warn('[documents] pre-render not scheduled —', error);
  }
}

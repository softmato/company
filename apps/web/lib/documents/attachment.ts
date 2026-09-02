import type { EmailAttachment } from '@/lib/email/send';

import { documentPdf } from './document-pdf';
import type { StorableDocument } from './pdf-store';
import { invoiceHtml, receiptHtml } from './render-html';
import type { InvoiceDocument, ReceiptDocument } from './types';

/**
 * A document as a file to hang on an email.
 *
 * **Returns `null` rather than throwing, always.** The caller is on the money
 * path — a receipt email goes out immediately after a journal has been posted
 * — and a PDF engine having a bad minute must not unwind a settled payment. A
 * receipt that arrives as an email without an attachment is a worse email; a
 * payment rolled back because Chrome was missing is an accounting problem.
 *
 * That is the same rule `sendPaymentReceipt` already follows, applied one
 * layer down so no future caller has to rediscover it.
 *
 * **This is also where a receipt gets stored.** It runs moments after a
 * payment settles, which is the earliest the document exists and the last
 * moment nobody is waiting for it — so the PDF built for the email is the same
 * object `GET /v1/receipts/{no}?format=pdf` serves afterwards, rather than a
 * second rendering of the same bytes. `documentPdf` does the storing; there is
 * nothing extra to remember here.
 */
export async function invoiceAttachment(
  document: InvoiceDocument,
): Promise<EmailAttachment | null> {
  return attach(
    document,
    invoiceHtml(document),
    `${safe(document.invoiceNo)}.pdf`,
  );
}

export async function receiptAttachment(
  document: ReceiptDocument,
): Promise<EmailAttachment | null> {
  return attach(
    document,
    receiptHtml(document),
    `Receipt-${safe(document.receiptNo)}.pdf`,
  );
}

async function attach(
  document: StorableDocument,
  html: string,
  filename: string,
): Promise<EmailAttachment | null> {
  try {
    const result = await documentPdf(document, html);

    if (!result.ok) {
      console.warn(`[documents] ${filename} not attached — ${result.reason}`);
      return null;
    }

    return { filename, content: result.pdf };
  } catch (error) {
    // `documentPdf` already returns rather than throws; this is the belt for
    // the case where it is changed and someone forgets.
    console.error(`[documents] ${filename} not attached —`, error);
    return null;
  }
}

/** `INV-2083/84-000010` → `INV-2083-84-000010`. A slash is not a filename. */
function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-');
}

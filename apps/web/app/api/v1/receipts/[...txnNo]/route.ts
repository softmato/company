/**
 * `GET /v1/receipts/{txn_no}` — the receipt for one payment.
 *
 * Addressed as its own resource rather than as `/payments/{no}/receipt`,
 * which Next cannot route: a catch-all segment must be the last segment, and
 * a transaction number's own slash forces the catch-all. Naming the receipt
 * directly is the better URL anyway — it is a document, not a sub-view of
 * something else.
 *
 * The natural follow-up to a `payment.success` webhook: the event says money
 * arrived, this is the document that proves it, ready to show in the SaaS's
 * own settings screen or hand to the customer as a PDF.
 *
 * **Only a payment that actually succeeded has one.** A pending or failed
 * transaction returns `404` rather than an empty receipt — a document
 * confirming money that has not arrived is worse than no document. The
 * distinction between "no such payment" and "that payment has no receipt" is
 * deliberately not drawn here: both are `RESOURCE_NOT_FOUND`, because a
 * consumer polling this endpoint should read the transaction's status from
 * the webhook or `/v1/checkout`, not infer it from which 404 it got.
 *
 * Scoped to the calling application, like its invoice sibling.
 */
import { PaymentError } from '@softmato/payment-core';

import {
  documentFile,
  documentFormat,
  joinReference,
} from '@/lib/api/document-response';
import { apiError } from '@/lib/api/respond';
import { readEndpoint } from '@/lib/api/route';
import { serializeReceiptDocument } from '@/lib/api/serialize-document';
import { buildReceiptDocument } from '@/lib/documents/receipt-document';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export const GET = readEndpoint<{ txnNo: string[] }>(
  'payment:read',
  async ({ application, params, request, requestId }) => {
    const txnNo = joinReference(params.txnNo);

    const document = await buildReceiptDocument(txnNo, application.id);

    if (!document) {
      return apiError(
        new PaymentError(
          'RESOURCE_NOT_FOUND',
          'No receipt for that payment. A receipt exists only once a payment has succeeded.',
          { transaction_id: txnNo },
        ),
        requestId,
      );
    }

    const format = documentFormat(request);

    if (format !== 'json') {
      return documentFile(format, document);
    }

    return {
      body: serializeReceiptDocument(document, documentUrl(txnNo)),
    };
  },
);

function documentUrl(txnNo: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');

  return `${base}/api/v1/receipts/${txnNo}`;
}

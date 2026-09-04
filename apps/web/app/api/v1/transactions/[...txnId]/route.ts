/**
 * `GET /v1/transactions/{txn_no}` — the state of one payment.
 *
 * The endpoint to answer "is TXN-123 paid?". A SaaS should ask this rather
 * than deciding from a return URL's query parameters, which are a claim by
 * whoever's browser made the request. The webhook and this call are the two
 * authoritative answers, and they speak the same status vocabulary on purpose
 * — `SUCCEEDED` here is `SUCCEEDED` there.
 *
 * **Scoped to the caller.** `application.id` is in the `WHERE` clause, so
 * another integrator's payment comes back `404` rather than `403` — byte for
 * byte the same answer as a payment that does not exist. Distinguishing them
 * would confirm that a guessed transaction number is real.
 *
 * A catch-all segment because `TXN-2083/84-00000008` contains a slash, the
 * same reason `receipts/[...txnNo]` is one. `joinReference` puts the number
 * back together rather than depending on every layer between the caller and
 * the router agreeing not to decode a `%2F`.
 *
 * Unlike its receipt sibling this has no `?format=` — a transaction is a
 * state, not a document. The document for a settled one is `/v1/receipts`.
 */
import { PaymentError, findTransactionView } from '@softmato/payment-core';

import { joinReference } from '@/lib/api/document-response';
import { apiError } from '@/lib/api/respond';
import { readEndpoint } from '@/lib/api/route';
import { serializeTransactionView } from '@/lib/api/serialize';

export const dynamic = 'force-dynamic';

export const GET = readEndpoint<{ txnId: string[] }>(
  'payment:read',
  async ({ application, params, requestId }) => {
    const txnNo = joinReference(params.txnId);

    const transaction = await findTransactionView(txnNo, application.id);

    if (!transaction) {
      return apiError(
        new PaymentError('RESOURCE_NOT_FOUND', 'No such transaction.', {
          transaction_id: txnNo,
        }),
        requestId,
      );
    }

    return { body: serializeTransactionView(transaction) };
  },
);

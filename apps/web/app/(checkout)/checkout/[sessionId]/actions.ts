'use server';

/**
 * The customer choosing a provider — the moment a page becomes a payment.
 *
 * What this replaces is worth naming, because it was the most direct hole in
 * the tree: the checkout page's pay button did a `fetch()` from the browser to
 * `/api/v1/webhooks/<provider>` with a body saying `status: 'succeeded'`, then
 * rendered a receipt. The customer's own client was the thing declaring the
 * payment complete. Nothing verified it, nothing recorded it, and once
 * settlement had been wired to those routes it would have posted to the
 * ledger.
 *
 * So the browser no longer says anything about the outcome of a payment. It
 * says which provider was picked, and everything after that is server-side:
 * `startPayment` books an attempt, the gateway takes the money, and the
 * callback route confirms it by asking the gateway directly.
 */
import { db } from '@softmato/db';
import {
  isPaymentError,
  isProviderId,
  startPayment,
  type FormPost,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { ensureProvidersRegistered } from '@/lib/payments/providers';

export type BeginPaymentResult =
  /** Follow this link. */
  | { ok: true; kind: 'redirect'; url: string }
  /** Submit this form. eSewa's ePay v2 does not answer a GET. */
  | { ok: true; kind: 'form'; formPost: FormPost }
  /** Show this to the customer. Never a raw error message. */
  | { ok: false; message: string };

export async function beginPayment(
  sessionId: string,
  providerId: string,
): Promise<BeginPaymentResult> {
  // A server action is a public endpoint. Both arguments arrive from a
  // browser, so neither is trusted: the provider is checked against the union
  // here, and `startPayment` checks it again against what the session actually
  // offered.
  if (!isProviderId(providerId)) {
    return { ok: false, message: 'That payment method is not available.' };
  }

  ensureProvidersRegistered();

  try {
    /*
     * One transaction, because `startPayment` allocates a transaction number
     * through an advisory lock that must be held across the insert — a
     * separate transaction leaves a hole in the sequence
     * (docs/DATABASE.md §3).
     */
    const started = await db.transaction((tx) =>
      startPayment(tx, { sessionId, providerId }, recordAudit),
    );

    if (started.initiate.formPost) {
      return { ok: true, kind: 'form', formPost: started.initiate.formPost };
    }

    if (started.initiate.redirectUrl) {
      return { ok: true, kind: 'redirect', url: started.initiate.redirectUrl };
    }

    /*
     * An adapter that booked an attempt and gave us nowhere to send the
     * customer. There is a real transaction row at this point, so this is not
     * merely a UI problem — it is left to `poll()` and reconciliation rather
     * than swallowed.
     */
    return {
      ok: false,
      message: 'That payment method could not be started. Please try another.',
    };
  } catch (error) {
    /*
     * `publicMessage` and never `error.message`: the internal one carries
     * provider responses and merchant identifiers, which is exactly what
     * `errors.ts` exists to keep away from a client. The old webhook routes
     * returned `err.message` directly.
     */
    if (isPaymentError(error)) {
      return { ok: false, message: error.publicMessage };
    }

    throw error;
  }
}

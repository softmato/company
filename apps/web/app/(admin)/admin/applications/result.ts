import 'server-only';

import { isPaymentError } from '@softmato/payment-core';

/**
 * The shape every action on this screen returns, and the one place a thrown
 * error becomes a message.
 *
 * Split out from `actions.ts` because a `'use server'` module may only export
 * async functions — a shared type or a synchronous helper cannot live there.
 */
export interface CredentialResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Shown once, immediately after issue or rotation. Never cached. */
  secret?: string;
  /** The webhook signing secret. A different credential from `secret`. */
  webhookSecret?: string;
  clientId?: string;
  applicationId?: number;
  /** Which credential set the result is about. Sandbox and Production differ. */
  credentialId?: number;
  /** When a rotated-away client secret stops working. */
  previousSecretExpiresAt?: string;
}

/**
 * Turns a thrown error into a message for the admin who caused it.
 *
 * This shows a `PaymentError`'s own `message`, which the API boundary
 * deliberately never sends. The audience is the difference: `apiError` answers
 * an authenticated *integrator*, where a leaked provider string or database
 * detail is an information disclosure. This answers the founder, signed in,
 * behind re-authentication, who is the person the detail is for — and who
 * cannot fix "The request body failed validation".
 *
 * The refusals reached from this screen are validation messages written for a
 * reader: which hostname was rejected, and why a wildcard is not accepted.
 * Losing them to a generic sentence would make the allowlist unusable exactly
 * when it is doing its job.
 *
 * Anything that is not a `PaymentError` still becomes one flat sentence — an
 * unexpected throw is as likely to be a Postgres constraint message as a
 * mistake anyone can act on.
 */
export function failure(error: unknown): CredentialResult {
  console.error(
    JSON.stringify({
      level: 'error',
      action: 'admin.application',
      message: error instanceof Error ? error.message : String(error),
    }),
  );

  if (isPaymentError(error)) {
    const message = error.publicDetail ?? error.message;
    const field = error.context?.['field'];

    /*
     * A refusal that knows which field caused it says so next to that field.
     *
     * Every `PaymentError` raised on the registration path already carries
     * `context.field` — `domains`, `webhookUrl`, `newProductId` — and none of
     * it reached the form, so a mistyped hostname came back as a sentence at
     * the bottom of the page with four inputs above it and no indication of
     * which one was wrong. The message is repeated at the top rather than
     * moved, because the field error is easy to miss on a long form and the
     * summary is what a screen reader announces.
     */
    return {
      ok: false,
      message,
      ...(typeof field === 'string'
        ? { fieldErrors: { [field]: message } }
        : {}),
    };
  }

  return { ok: false, message: 'That did not work, so nothing changed.' };
}

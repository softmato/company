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
    return { ok: false, message: error.publicDetail ?? error.message };
  }

  return { ok: false, message: 'That did not work, so nothing changed.' };
}

import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { ZodError } from 'zod';

import { PaymentError, isPaymentError } from '@softmato/payment-core';

/**
 * The only place an error becomes a response body (docs/API.md §1).
 *
 * Two rules are enforced here rather than remembered at each call site: the
 * message a client sees comes from a fixed table keyed by code, never from the
 * thrown error; and every error is logged with its detail before that detail
 * is discarded. A provider error string can carry merchant identifiers, so
 * "never leak internals" has to be structural (docs/RULES.md §5).
 *
 * `detail` is the one narrow exception, and it does not bend either rule:
 * `message` still comes from the table, and `detail` appears only when the
 * throw site explicitly wrote one as safe to send. See `PaymentError`.
 */

export function apiJson(
  body: unknown,
  { status = 200, requestId }: { status?: number; requestId: string },
): Response {
  return Response.json(body, {
    status,
    headers: { 'x-request-id': requestId },
  });
}

export function apiError(error: unknown, requestId: string): Response {
  const payment = toPaymentError(error);

  // Log the detail. This is the only copy — the response keeps none of it.
  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      code: payment.code,
      message: payment.message,
      context: payment.context ?? null,
    }),
  );

  // A caller's own mistake is not an incident; a 5xx always is.
  if (payment.status >= 500) {
    Sentry.captureException(error, {
      extra: { requestId, code: payment.code, context: payment.context },
    });
  }

  return Response.json(
    {
      error: {
        code: payment.code,
        message: payment.publicMessage,
        ...(payment.publicDetail !== undefined
          ? { detail: payment.publicDetail }
          : {}),
        request_id: requestId,
      },
    },
    {
      status: payment.status,
      headers: { 'x-request-id': requestId },
    },
  );
}

function toPaymentError(error: unknown): PaymentError {
  if (isPaymentError(error)) return error;

  if (error instanceof ZodError) {
    return new PaymentError('VALIDATION_FAILED', 'Request body failed zod', {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Anything unrecognised is our bug, not the caller's. They get a 500 and a
  // request id; the stack goes to the log and to Sentry.
  return new PaymentError(
    'INTERNAL',
    error instanceof Error ? (error.stack ?? error.message) : String(error),
    { unexpected: true },
  );
}

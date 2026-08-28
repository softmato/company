import 'server-only';
import type { ApplicationScope } from '@softmato/db';
import {
  assertScope,
  authenticateApplication,
  withIdempotency,
  type AuthenticatedApplication,
  type DbTxHandler,
} from '@softmato/payment-core';
import { PaymentError } from '@softmato/payment-core';

import { newRequestId } from './request-id';
import { apiError, apiJson } from './respond';

/**
 * The shape every `/api/v1` handler has.
 *
 * "Route handlers stay thin. Parse, authenticate, call into a package,
 * serialize. Business logic never lives in `app/api/`"
 * (docs/FOLDER_STRUCTURE.md). This file is the parse-and-authenticate half, so
 * each route is left with the two lines that are actually about it.
 */

export interface ApiContext {
  application: AuthenticatedApplication;
  requestId: string;
  body: unknown;
}

/** A read endpoint: authenticate, check scope, run. */
export function readEndpoint(
  scope: ApplicationScope,
  handler: (context: ApiContext) => Promise<{ status?: number; body: unknown }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const requestId = newRequestId();

    try {
      const application = await authenticateApplication(
        request.headers.get('authorization'),
      );
      assertScope(application, scope);

      const result = await handler({ application, requestId, body: null });
      return apiJson(result.body, { status: result.status ?? 200, requestId });
    } catch (error) {
      return apiError(error, requestId);
    }
  };
}

/**
 * A mutating endpoint: authenticate, check scope, require `Idempotency-Key`,
 * run inside the transaction the idempotency layer owns.
 *
 * The key is required rather than optional. docs/API.md §1 says mutating
 * requests need one, and an endpoint that quietly accepts a request without it
 * is an endpoint that can be made to charge twice by a dropped connection.
 */
export function mutatingEndpoint<T extends Record<string, unknown>>(
  scope: ApplicationScope,
  endpoint: string,
  handler: (
    context: ApiContext & { tx: DbTxHandler },
  ) => Promise<{ status?: number; body: T }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const requestId = newRequestId();

    try {
      const application = await authenticateApplication(
        request.headers.get('authorization'),
      );
      assertScope(application, scope);

      const key = request.headers.get('idempotency-key');
      if (!key) {
        throw new PaymentError(
          'VALIDATION_FAILED',
          'Idempotency-Key header is required on a mutating request',
          { endpoint },
        );
      }

      const body = await readJson(request);

      const outcome = await withIdempotency(
        { applicationId: application.id, key, endpoint, request: body },
        async (tx) => {
          const result = await handler({ application, requestId, body, tx });
          return { status: result.status ?? 200, body: result.body };
        },
      );

      return apiJson(outcome.body, { status: outcome.status, requestId });
    } catch (error) {
      return apiError(error, requestId);
    }
  };
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === '') return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Request body is not valid JSON',
      {},
    );
  }
}

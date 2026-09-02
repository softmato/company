/**
 * The one error type a consumer catches.
 *
 * The API returns a documented `code` (docs/API.md §1) and a message that is
 * fixed per code — it is never a thrown error's text, and never carries
 * provider internals. That makes `code` the thing worth branching on, so it is
 * a typed union here rather than a loose string: a consumer writing
 * `err.code === 'RATE_LIMITED'` gets a compile error on a typo instead of a
 * branch that silently never runs.
 */

/** docs/API.md §1. `INTERNAL` is the catch-all for anything unrecognised. */
export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'INSUFFICIENT_SCOPE',
  'RESOURCE_NOT_FOUND',
  'IDEMPOTENCY_CONFLICT',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'INTERNAL',
  'PROVIDER_UNAVAILABLE',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' &&
    (API_ERROR_CODES as readonly string[]).includes(value)
  );
}

export class SoftmatoApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    /** Quote this when asking us about a specific failure. */
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = 'SoftmatoApiError';
  }

  /**
   * Whether trying the same request again could plausibly succeed.
   *
   * Retrying a `VALIDATION_FAILED` is pointless and retrying an
   * `IDEMPOTENCY_CONFLICT` is actively wrong — it means the same key was used
   * with a *different* body, so a retry either repeats the mistake or, if the
   * body is corrected, invents a second meaning for one key.
   */
  get retryable(): boolean {
    return (
      this.code === 'RATE_LIMITED' ||
      this.code === 'PROVIDER_UNAVAILABLE' ||
      this.code === 'INTERNAL'
    );
  }
}

/**
 * A failure that never reached the API — DNS, TLS, a timeout, a dropped
 * connection. Separate from `SoftmatoApiError` because the correct response
 * differs: this one is always safe to retry with the *same* `Idempotency-Key`,
 * since we may or may not have processed the request and the key is what makes
 * asking again harmless.
 */
export class SoftmatoTransportError extends Error {
  constructor(message: string, cause?: unknown) {
    // The standard `Error.cause`, so a consumer's logger picks it up the way
    // it picks up every other wrapped error.
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'SoftmatoTransportError';
  }
}

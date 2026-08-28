/**
 * Typed errors, not strings (docs/RULES.md §5).
 *
 * Each code fixes two things so no caller can get them wrong:
 *
 *   * the HTTP status it becomes at the API boundary (docs/API.md §1), and
 *   * the message a client is allowed to see.
 *
 * The `message` passed to the constructor is for the log and for Sentry. It
 * never reaches a client — a provider error string can carry merchant
 * identifiers, and "never leak internals to a client" is only true if the
 * leaking is impossible rather than merely discouraged.
 */

/** Code → HTTP status. The seven in docs/API.md §1, plus internal ones. */
export const PAYMENT_ERROR_STATUS = {
  // ── Documented in docs/API.md §1 ──────────────────────────────────────────
  UNAUTHENTICATED: 401,
  INSUFFICIENT_SCOPE: 403,
  RESOURCE_NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 502,

  // ── Internal. Reachable through the API, but with a generic message. ──────
  /**
   * Nothing recognised it. Not in the docs/API.md §1 table, because that table
   * lists what a caller can act on and this is by definition our bug — but a
   * 502 would blame a provider for our own crash, so it has its own code.
   */
  INTERNAL: 500,
  /** A signature or secret failed verification. Fail closed, always. */
  INVALID_SIGNATURE: 400,
  /** The provider reported an amount we did not expect. Never auto-resolve. */
  AMOUNT_MISMATCH: 409,
  SESSION_EXPIRED: 410,
  /** The same provider event arrived twice. Not an error the caller caused. */
  DUPLICATE_EVENT: 409,
  /** A state machine refused a move. Means a bug or a race, never user input. */
  ILLEGAL_TRANSITION: 409,
  /** The state exists but forbids the operation — paying a paid session. */
  INVALID_STATE: 409,
} as const;

export type PaymentErrorCode = keyof typeof PAYMENT_ERROR_STATUS;

/**
 * What a client is told. Deliberately uninformative for anything that could
 * describe our internals or a provider's.
 */
const PUBLIC_MESSAGE: Record<PaymentErrorCode, string> = {
  UNAUTHENTICATED: 'Authentication failed',
  INSUFFICIENT_SCOPE: 'This credential is not permitted to perform that action',
  RESOURCE_NOT_FOUND: 'Not found',
  IDEMPOTENCY_CONFLICT:
    'This Idempotency-Key was already used with a different request body',
  VALIDATION_FAILED: 'The request body failed validation',
  RATE_LIMITED: 'Too many requests',
  PROVIDER_UNAVAILABLE: 'The payment provider is unavailable',
  INTERNAL: 'Something went wrong on our side',
  INVALID_SIGNATURE: 'Signature verification failed',
  AMOUNT_MISMATCH: 'The payment is held for review',
  SESSION_EXPIRED: 'This payment session has expired',
  DUPLICATE_EVENT: 'Already processed',
  ILLEGAL_TRANSITION: 'The resource is not in a state that allows that',
  INVALID_STATE: 'The resource is not in a state that allows that',
};

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    /** Internal detail. Logged, never serialised to a client. */
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PaymentError';
  }

  get status(): number {
    return PAYMENT_ERROR_STATUS[this.code];
  }

  /** The only string that may be sent to a caller. */
  get publicMessage(): string {
    return PUBLIC_MESSAGE[this.code];
  }
}

export function isPaymentError(err: unknown): err is PaymentError {
  return err instanceof PaymentError;
}

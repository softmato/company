/**
 * Signing outbound events, and verifying them the way a consumer must.
 *
 * The scheme is docs/API.md §4:
 *
 *     X-Softmato-Signature: <hex hmac-sha256 of "{timestamp}.{body}">
 *     X-Softmato-Timestamp: 1754990400
 *
 * **The timestamp is inside the signed string, not beside it.** If the
 * signature covered only the body, a captured delivery could be replayed
 * forever with a fresh timestamp header — the signature would still verify.
 * Binding the two means a replay must reuse the original timestamp, which is
 * what makes the age check below meaningful rather than decorative.
 *
 * `verify` lives here as well as in `@softmato/sdk`, and the duplication is
 * deliberate: a consumer must not have to install this package — and through
 * it Drizzle and a database driver — to check a signature. The two are kept
 * honest by `SHARED_VECTOR` below, which both suites assert against, so a
 * change to either implementation fails a test rather than silently splitting
 * the scheme in half.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Deliveries older than this are refused, per docs/API.md §4. */
export const MAX_AGE_SECONDS = 300;

export function signingBase(timestamp: number, body: string): string {
  return `${timestamp}.${body}`;
}

export function sign(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret)
    .update(signingBase(timestamp, body), 'utf8')
    .digest('hex');
}

export interface VerifyInput {
  secret: string;
  /** The raw request body, exactly as received. Never a re-serialised object. */
  body: string;
  /**
   * Admits `undefined` because that is what a header lookup returns when the
   * header is absent — see the guard at the top of `verify`.
   */
  signature: string | undefined | null;
  timestamp: string | number | undefined | null;
  now?: Date;
  maxAgeSeconds?: number;
}

export type VerifyFailure =
  | 'missing_signature'
  | 'malformed_timestamp'
  | 'timestamp_too_old'
  | 'timestamp_in_future'
  | 'signature_mismatch';

export type VerifyResult =
  { valid: true } | { valid: false; reason: VerifyFailure };

/**
 * Returns a reason rather than throwing, because a consumer's correct response
 * to each failure is the same (reject) but their correct *log line* is not.
 */
export function verify(input: VerifyInput): VerifyResult {
  /*
   * No signature header at all — caught before the comparison, because
   * `Buffer.from(undefined)` throws and an unauthenticated empty POST would
   * then surface as an exception rather than a rejection. Kept identical to
   * `@softmato/sdk`'s guard; the two implementations are meant to answer the
   * same way to the same request.
   */
  if (typeof input.signature !== 'string' || input.signature === '') {
    return { valid: false, reason: 'missing_signature' };
  }

  /*
   * The blank header has to be caught before `Number` sees it: `Number('')` is
   * `0`, a perfectly good integer, so an absent timestamp would sail through
   * and be reported as `timestamp_too_old` — a misleading answer to the
   * question "why was this rejected", which is the only reason these reasons
   * exist.
   */
  const raw =
    typeof input.timestamp === 'number'
      ? input.timestamp
      : input.timestamp?.trim();

  if (raw === '' || raw === undefined || raw === null) {
    return { valid: false, reason: 'malformed_timestamp' };
  }

  const timestamp = Number(raw);

  if (!Number.isInteger(timestamp)) {
    return { valid: false, reason: 'malformed_timestamp' };
  }

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const maxAge = input.maxAgeSeconds ?? MAX_AGE_SECONDS;
  const age = nowSeconds - timestamp;

  if (age > maxAge) return { valid: false, reason: 'timestamp_too_old' };

  /*
   * A timestamp from the future is not merely odd. Without this, a signature
   * could be minted with a timestamp years ahead and replayed indefinitely,
   * since `age` would stay negative forever. The tolerance covers ordinary
   * clock skew between two servers.
   */
  if (age < -maxAge) return { valid: false, reason: 'timestamp_in_future' };

  const expected = sign(input.secret, timestamp, input.body);

  return equalInConstantTime(expected, input.signature)
    ? { valid: true }
    : { valid: false, reason: 'signature_mismatch' };
}

function equalInConstantTime(expected: string, claimed: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(claimed, 'utf8');

  // `timingSafeEqual` throws on a length mismatch; a hex digest's length is
  // fixed and public, so short-circuiting on it leaks nothing.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * A fixed known-good signature, asserted by this package's tests **and** by
 * `@softmato/sdk`'s. It is the contract between the two implementations: if
 * either stops producing this digest for these inputs, they have drifted and a
 * consumer's verification starts rejecting genuine deliveries.
 *
 * Do not regenerate it to make a test pass. If this value has to change, the
 * wire format has changed, and every deployed consumer breaks with it.
 */
export const SHARED_VECTOR = {
  secret: 'whsec_test_2f9a1c',
  timestamp: 1754990400,
  body: '{"event":"payment.success","transaction_id":"TXN-2082/83-00000001"}',
  signature: '7b1621acf4b889b18381561a84badc43490db7d379de864fcfb4f5788a2498d3',
} as const;

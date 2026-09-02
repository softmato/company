/**
 * Verifying a webhook we sent you.
 *
 * **Do this before reading a single field of the body.** The endpoint is
 * public, so until the signature checks out the payload is a stranger's claim
 * that they were paid — and the thing most consumers do with
 * `payment.success` is provision something.
 *
 * Two mistakes this is shaped to prevent:
 *
 * **Verifying a re-serialised body.** The signature covers the exact bytes we
 * sent. `JSON.stringify(req.body)` after a framework has parsed it is a
 * *different* string — key order and number formatting are not guaranteed to
 * survive the round trip — and it will fail for genuine deliveries. Pass the
 * raw body. In Express that means `express.raw({ type: 'application/json' })`
 * on this route; in Next, `await request.text()`.
 *
 * **Skipping the age check.** A signature alone does not stop a replay: it
 * stays valid forever. The timestamp is inside the signed string precisely so
 * that a captured delivery cannot be re-sent with a fresh one, and this
 * rejects anything older than five minutes (docs/API.md §4).
 *
 * This is implemented here rather than imported from `@softmato/payment-core`
 * so that installing the SDK does not pull a database driver into your
 * application. The two are held in step by `SHARED_VECTOR`, which both test
 * suites assert against.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { WebhookEvent, WebhookPayload } from './events.js';

/** docs/API.md §4. */
export const MAX_AGE_SECONDS = 300;

export type VerifyFailure =
  | 'missing_signature'
  | 'malformed_timestamp'
  | 'timestamp_too_old'
  | 'timestamp_in_future'
  | 'signature_mismatch';

export type VerifyResult =
  | { valid: true; payload: WebhookPayload }
  | { valid: false; reason: VerifyFailure };

export interface VerifyInput {
  /** Your application's webhook secret. */
  secret: string;
  /** The **raw** request body. Not a parsed object, not a re-stringified one. */
  body: string;
  /**
   * `X-Softmato-Signature`.
   *
   * Typed to admit `undefined` because that is what a header lookup returns
   * when the header is absent, and an absent header is the *normal* case for
   * the unauthenticated traffic that finds a public endpoint. Asserting it
   * away with `!` moves the problem from a returned reason to a thrown
   * `TypeError` inside your route.
   */
  signature: string | undefined | null;
  /** `X-Softmato-Timestamp`. */
  timestamp: string | number | undefined | null;
  now?: Date;
  maxAgeSeconds?: number;
}

export function signingBase(timestamp: number, body: string): string {
  return `${timestamp}.${body}`;
}

export function sign(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret)
    .update(signingBase(timestamp, body), 'utf8')
    .digest('hex');
}

/**
 * Returns the parsed payload only on success, so there is no way to verify and
 * then read the body from somewhere else by accident.
 */
export function verifyWebhook(input: VerifyInput): VerifyResult {
  /*
   * No signature header at all. This has to be caught here rather than left to
   * the comparison, because `Buffer.from(undefined)` *throws* — so an empty
   * POST to a public endpoint would come back not as `{ valid: false }` but as
   * an exception unwinding through the consumer's route. That is a 500 where a
   * 400 belongs, and in a bare `node:http` server it takes the process down.
   * Anyone can send that request; nothing about it is authenticated.
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

  // A timestamp far in the future would otherwise stay valid indefinitely.
  // The tolerance covers ordinary clock skew between two servers.
  if (age < -maxAge) return { valid: false, reason: 'timestamp_in_future' };

  const expected = sign(input.secret, timestamp, input.body);

  if (!equalInConstantTime(expected, input.signature)) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  return { valid: true, payload: JSON.parse(input.body) as WebhookPayload };
}

/** Narrow a verified payload to one event. */
export function isEvent<E extends WebhookEvent>(
  payload: WebhookPayload,
  event: E,
): payload is WebhookPayload & { event: E } {
  return payload.event === event;
}

function equalInConstantTime(expected: string, claimed: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(claimed, 'utf8');

  // `timingSafeEqual` throws on a length mismatch. A hex digest's length is
  // fixed and public, so short-circuiting on it leaks nothing.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * The contract between this implementation and the server's. Both suites
 * assert it. Do not regenerate it to make a test pass — if this value changes,
 * the wire format has changed and every deployed consumer breaks with it.
 */
export const SHARED_VECTOR = {
  secret: 'whsec_test_2f9a1c',
  timestamp: 1754990400,
  body: '{"event":"payment.success","transaction_id":"TXN-2082/83-00000001"}',
  signature: '7b1621acf4b889b18381561a84badc43490db7d379de864fcfb4f5788a2498d3',
} as const;

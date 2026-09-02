import { describe, expect, it } from 'vitest';

import {
  MAX_AGE_SECONDS,
  SHARED_VECTOR,
  isEvent,
  sign,
  verifyWebhook,
} from '../webhooks';

const SECRET = 'whsec_consumer';
const AT = new Date('2026-09-01T12:00:00Z');
const TS = Math.floor(AT.getTime() / 1000);

const PAYLOAD = {
  event: 'payment.success',
  transaction_id: 'TXN-2082/83-00000001',
  invoice_id: 'HH-2026-00123',
  amount: 1200000,
  currency: 'NPR',
  status: 'SUCCEEDED',
  occurred_at: '2026-09-01T12:00:00.000Z',
};

const BODY = JSON.stringify(PAYLOAD);

function verified(overrides: Record<string, unknown> = {}) {
  return verifyWebhook({
    secret: SECRET,
    body: BODY,
    timestamp: TS,
    signature: sign(SECRET, TS, BODY),
    now: AT,
    ...overrides,
  } as Parameters<typeof verifyWebhook>[0]);
}

/**
 * The contract with `@softmato/payment-core`, which signs. The two implement
 * this scheme independently so a consumer need not install a database driver
 * to check a signature — this is what stops them drifting.
 */
describe('the shared vector', () => {
  it('produces the digest the server asserts', () => {
    expect(
      sign(SHARED_VECTOR.secret, SHARED_VECTOR.timestamp, SHARED_VECTOR.body),
    ).toBe(SHARED_VECTOR.signature);
  });
});

describe('verifyWebhook', () => {
  it('accepts a genuine delivery and hands back the parsed payload', () => {
    const result = verified();

    expect(result.valid).toBe(true);
    if (!result.valid) return;

    expect(result.payload.transaction_id).toBe('TXN-2082/83-00000001');
    expect(result.payload.amount).toBe(1200000);
  });

  /** The payload is returned only on success, so it cannot be read otherwise. */
  it('returns no payload when verification fails', () => {
    const result = verified({ signature: 'deadbeef'.repeat(8) });

    expect(result.valid).toBe(false);
    expect(result).not.toHaveProperty('payload');
  });

  it('rejects an amount edited after signing', () => {
    const tampered = JSON.stringify({ ...PAYLOAD, amount: 1 });

    expect(verified({ body: tampered })).toEqual({
      valid: false,
      reason: 'signature_mismatch',
    });
  });

  it('rejects a stale delivery, which is what stops a replay', () => {
    expect(
      verified({ now: new Date(AT.getTime() + (MAX_AGE_SECONDS + 60) * 1000) }),
    ).toEqual({ valid: false, reason: 'timestamp_too_old' });
  });

  it('rejects a timestamp far in the future', () => {
    const future = TS + MAX_AGE_SECONDS * 10;

    expect(
      verifyWebhook({
        secret: SECRET,
        body: BODY,
        timestamp: future,
        signature: sign(SECRET, future, BODY),
        now: AT,
      }),
    ).toEqual({ valid: false, reason: 'timestamp_in_future' });
  });

  it('rejects a malformed timestamp header', () => {
    for (const bad of ['', 'abc', '12.5']) {
      expect(verified({ timestamp: bad })).toEqual({
        valid: false,
        reason: 'malformed_timestamp',
      });
    }
  });

  /**
   * Regression, found on 2026-09-02 by sending the receiver in
   * `scripts/webhook-receiver.mts` a POST with no signature header: it did not
   * reject it, it threw `ERR_INVALID_ARG_TYPE` out of `Buffer.from(undefined)`
   * and the process exited.
   *
   * This is unauthenticated input — a public endpoint receives it from anyone
   * who finds the URL — so "returns a reason" and "throws" are the difference
   * between a 400 and a consumer's route 500ing, or in a bare `node:http`
   * server, dying. `headers.get()` returns `null` and `node:http` gives
   * `undefined`, so both have to be answers rather than exceptions.
   */
  it('rejects a delivery with no signature header instead of throwing', () => {
    for (const missing of [undefined, null, '']) {
      expect(verified({ signature: missing })).toEqual({
        valid: false,
        reason: 'missing_signature',
      });
    }
  });

  it('fails closed on a signature of the wrong length rather than throwing', () => {
    expect(verified({ signature: 'ab' })).toEqual({
      valid: false,
      reason: 'signature_mismatch',
    });
  });

  /**
   * The mistake most consumers make: verifying `JSON.stringify(req.body)`
   * after a framework parsed it. Key order and number formatting need not
   * survive that round trip, so the signature fails for genuine deliveries.
   */
  it('fails when a re-serialised body differs from the bytes sent', () => {
    const reordered = JSON.stringify({
      transaction_id: PAYLOAD.transaction_id,
      event: PAYLOAD.event,
      invoice_id: PAYLOAD.invoice_id,
      amount: PAYLOAD.amount,
      currency: PAYLOAD.currency,
      status: PAYLOAD.status,
      occurred_at: PAYLOAD.occurred_at,
    });

    expect(reordered).not.toBe(BODY);
    expect(verified({ body: reordered })).toEqual({
      valid: false,
      reason: 'signature_mismatch',
    });
  });
});

describe('isEvent', () => {
  it('narrows a verified payload to one event', () => {
    const result = verified();
    if (!result.valid) throw new Error('unreachable');

    expect(isEvent(result.payload, 'payment.success')).toBe(true);
    expect(isEvent(result.payload, 'payment.failed')).toBe(false);
  });
});

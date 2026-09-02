import { describe, expect, it } from 'vitest';

import {
  MAX_AGE_SECONDS,
  SHARED_VECTOR,
  sign,
  signingBase,
  verify,
} from '../webhooks/signature';

const SECRET = 'whsec_test_2f9a1c';
const BODY = '{"event":"payment.success","amount":1200000}';
const AT = new Date('2026-09-01T12:00:00Z');
const TS = Math.floor(AT.getTime() / 1000);

describe('the wire format', () => {
  it('signs "{timestamp}.{body}"', () => {
    expect(signingBase(1754990400, '{"a":1}')).toBe('1754990400.{"a":1}');
  });

  /**
   * The contract with `@softmato/sdk`, which implements this independently so
   * that consumers need not install this package. If this fails, the two have
   * drifted and every deployed consumer starts rejecting genuine deliveries.
   * Do not regenerate the vector to make it pass.
   */
  it('matches the vector the SDK asserts', () => {
    expect(
      sign(SHARED_VECTOR.secret, SHARED_VECTOR.timestamp, SHARED_VECTOR.body),
    ).toBe(SHARED_VECTOR.signature);
  });
});

describe('verify', () => {
  function signed(overrides: Partial<Parameters<typeof verify>[0]> = {}) {
    return verify({
      secret: SECRET,
      body: BODY,
      timestamp: TS,
      signature: sign(SECRET, TS, BODY),
      now: AT,
      ...overrides,
    });
  }

  it('accepts a genuine delivery', () => {
    expect(signed()).toEqual({ valid: true });
  });

  it('rejects a body edited after signing', () => {
    expect(
      signed({ body: '{"event":"payment.success","amount":120000000}' }),
    ).toEqual({ valid: false, reason: 'signature_mismatch' });
  });

  it('rejects a signature made with a different secret', () => {
    expect(signed({ signature: sign('other-secret', TS, BODY) })).toEqual({
      valid: false,
      reason: 'signature_mismatch',
    });
  });

  /**
   * The replay defence. A signature alone never expires, so without this a
   * captured delivery could be re-sent indefinitely.
   */
  it('rejects a delivery older than the freshness window', () => {
    const stale = new Date(AT.getTime() + (MAX_AGE_SECONDS + 60) * 1000);

    expect(signed({ now: stale })).toEqual({
      valid: false,
      reason: 'timestamp_too_old',
    });
  });

  it('tolerates ordinary clock skew inside the window', () => {
    const slightly = new Date(AT.getTime() + (MAX_AGE_SECONDS - 30) * 1000);

    expect(signed({ now: slightly })).toEqual({ valid: true });
  });

  /**
   * Without this, a signature minted with a timestamp years ahead would stay
   * valid forever — `age` would never become positive.
   */
  it('rejects a timestamp far in the future', () => {
    const future = TS + MAX_AGE_SECONDS * 10;

    expect(
      verify({
        secret: SECRET,
        body: BODY,
        timestamp: future,
        signature: sign(SECRET, future, BODY),
        now: AT,
      }),
    ).toEqual({ valid: false, reason: 'timestamp_in_future' });
  });

  it('rejects a timestamp that is not an integer', () => {
    for (const bad of ['', 'abc', '12.5', 'NaN']) {
      expect(signed({ timestamp: bad })).toEqual({
        valid: false,
        reason: 'malformed_timestamp',
      });
    }
  });

  it('fails closed on a signature of the wrong length rather than throwing', () => {
    expect(signed({ signature: 'ab' })).toEqual({
      valid: false,
      reason: 'signature_mismatch',
    });
  });

  /**
   * The counterpart of the SDK's regression test for the same defect, kept
   * here because these two implementations are supposed to answer identically
   * to the same request — that is what `SHARED_VECTOR` is for, and a
   * divergence in *behaviour* is as much a split as a divergence in digest.
   * An absent header threw `ERR_INVALID_ARG_TYPE` rather than rejecting.
   */
  it('rejects a delivery with no signature header instead of throwing', () => {
    for (const missing of [undefined, null, '']) {
      expect(signed({ signature: missing })).toEqual({
        valid: false,
        reason: 'missing_signature',
      });
    }
  });
});

import { describe, expect, it } from 'vitest';

import { PaymentError } from '../errors';
import {
  assertSignature,
  baseString,
  REQUEST_SIGNED_FIELDS,
  sign,
} from '../providers/esewa/signature';

/**
 * eSewa's published sandbox secret. Public, and only ever used against rc-epay.
 *
 * Verified against the live sandbox on 2026-09-02 — see the pinning test at the
 * bottom of this file. Until that date this constant read `8gBwcE4DOHB28vvi`,
 * which is not an eSewa key at all; the tests passed anyway because they signed
 * and verified with the same wrong value, which is exactly the hole the pinning
 * test closes.
 */
const SECRET = '8gBm/:&EnhH.1/q';

/** A payload as eSewa returns it, correctly signed. */
function genuine(
  overrides: Record<string, string> = {},
): Record<string, string> {
  const payload: Record<string, string> = {
    transaction_code: '000AWEO',
    status: 'COMPLETE',
    total_amount: '2500.00',
    transaction_uuid: 'cs-test-0001',
    product_code: 'EPAYTEST',
    signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code',
    ...overrides,
  };

  const fields = payload.signed_field_names!.split(',');
  payload.signature = sign(SECRET, baseString(fields, payload));

  return payload;
}

describe('baseString', () => {
  it('joins named fields in the order given', () => {
    expect(
      baseString(REQUEST_SIGNED_FIELDS, {
        total_amount: '100.00',
        transaction_uuid: 'abc',
        product_code: 'EPAYTEST',
      }),
    ).toBe('total_amount=100.00,transaction_uuid=abc,product_code=EPAYTEST');
  });

  it('refuses to sign around a field that is absent', () => {
    expect(() =>
      baseString(REQUEST_SIGNED_FIELDS, { total_amount: '100.00' }),
    ).toThrow(PaymentError);
  });
});

describe('assertSignature', () => {
  it('accepts a genuine payload', () => {
    expect(() => assertSignature(SECRET, genuine())).not.toThrow();
  });

  /**
   * **The forgery this whole module exists to stop.**
   *
   * `handleCallback` used to decode eSewa's payload, read `decoded.signature`,
   * and never check it — then trust `status` and `total_amount` from the same
   * payload. The callback URL is public, so anyone able to POST to it could
   * declare any payment complete for any amount, and settlement would have
   * posted it to the ledger.
   *
   * Here the attacker keeps eSewa's real signature and edits the amount, which
   * is the cheapest version of the attack and the one that pays.
   */
  it('rejects a payload whose amount was edited after signing', () => {
    const forged = { ...genuine(), total_amount: '25000.00' };

    expect(() => assertSignature(SECRET, forged)).toThrow(PaymentError);
    expect(() => assertSignature(SECRET, forged)).toThrow(/does not verify/);
  });

  it('rejects a payload whose status was edited after signing', () => {
    const forged = { ...genuine({ status: 'PENDING' }), status: 'COMPLETE' };

    expect(() => assertSignature(SECRET, forged)).toThrow(PaymentError);
  });

  it('rejects a wholly invented payload', () => {
    expect(() =>
      assertSignature(SECRET, {
        status: 'COMPLETE',
        total_amount: '999999.00',
        transaction_uuid: 'cs-test-0001',
        product_code: 'EPAYTEST',
        signed_field_names: 'status,total_amount,transaction_uuid,product_code',
        signature: 'bm90LWEtcmVhbC1zaWduYXR1cmU=',
      }),
    ).toThrow(PaymentError);
  });

  it('rejects a payload signed with a different secret', () => {
    const payload = genuine();
    const fields = payload.signed_field_names!.split(',');
    payload.signature = sign('wrong-secret-key', baseString(fields, payload));

    expect(() => assertSignature(SECRET, payload)).toThrow(PaymentError);
  });

  it('rejects a payload carrying no signature at all', () => {
    const { signature: _dropped, ...unsigned } = genuine();

    expect(() => assertSignature(SECRET, unsigned)).toThrow(PaymentError);
  });

  it('rejects a payload carrying no signed_field_names', () => {
    const { signed_field_names: _dropped, ...payload } = genuine();

    expect(() => assertSignature(SECRET, payload)).toThrow(PaymentError);
  });

  /**
   * The field list must come from the response, not from a constant of ours.
   * Verifying a list of our own choosing would check a different string than
   * the one eSewa signed — which passes for payloads eSewa never sent.
   */
  it('verifies over the field list the response itself declares', () => {
    const shortened = genuine({ signed_field_names: 'total_amount,transaction_uuid' });

    expect(() => assertSignature(SECRET, shortened)).not.toThrow();
  });

  it('rejects when the declared field list is edited but the signature is not', () => {
    const tampered = {
      ...genuine(),
      signed_field_names: 'total_amount,transaction_uuid',
    };

    expect(() => assertSignature(SECRET, tampered)).toThrow(PaymentError);
  });

  it('fails closed on a signature of the wrong length rather than crashing', () => {
    // `timingSafeEqual` throws on a length mismatch; the caller must not.
    expect(() => assertSignature(SECRET, { ...genuine(), signature: 'x' })).toThrow(
      PaymentError,
    );
  });
});

/*
 * The regression this file did not have, and the reason a wrong secret key
 * survived in the tree for a full session while every test stayed green.
 *
 * Every other test here signs with `SECRET` and verifies with `SECRET`, so it
 * proves the HMAC round-trips — and it round-trips just as happily with a key
 * eSewa has never heard of. It did: the constant read `8gBwcE4DOHB28vvi`,
 * these tests passed, and posting the v2 form to rc-epay returned
 * `{"code":"ES104","message":"Invalid payload signature."}` every time.
 *
 * A self-consistent test cannot catch a wrong shared secret. Only a value from
 * outside the test can, so the vector below is pinned: base string in,
 * signature out, both constants. Change `SECRET` and this fails.
 *
 * The vector was produced with the key eSewa's sandbox actually accepts,
 * confirmed on 2026-09-02 by posting a signed form to
 * `rc-epay.esewa.com.np/api/epay/main/v2/form` and receiving a 302 into the
 * payment page rather than ES104.
 */
describe('the sandbox secret key itself', () => {
  it('is the key eSewa accepts, pinned by a known vector', () => {
    expect(SECRET).toBe('8gBm/:&EnhH.1/q');

    expect(
      sign(
        SECRET,
        baseString(REQUEST_SIGNED_FIELDS, {
          total_amount: '100',
          transaction_uuid: 'softmato-pin-vector',
          product_code: 'EPAYTEST',
        }),
      ),
    ).toBe('LvBt/1mcLXK+SEG9/FuXpkELLvU1i5/OzIPmgYibO28=');
  });
});

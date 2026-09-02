/**
 * eSewa's HMAC-SHA256 signatures, in both directions.
 *
 * eSewa signs a base string built from named fields:
 *
 *     total_amount=100.00,transaction_uuid=abc-123,product_code=EPAYTEST
 *
 * The names come from `signed_field_names`, comma separated, and the order in
 * that list **is** the order in the base string. The digest is base64.
 *
 * ---
 *
 * **The verification half of this file is the fix for the worst defect in the
 * package.** `handleCallback` used to base64-decode eSewa's response, read
 * `decoded.signature`, and then never look at it again — it went straight on
 * to trust `status` and `total_amount` from the same payload. The callback URL
 * is public, so anyone who could POST to it could declare any payment complete
 * for any amount, and the settlement path would have posted it to the ledger.
 *
 * Two details make the verification real rather than decorative:
 *
 *   1. **The field list comes from the response, not from a constant.** eSewa
 *      chooses which fields it signed, and checking a list of our own choosing
 *      would verify a different string than the one that was signed — passing
 *      for payloads eSewa never sent.
 *   2. **The comparison is timing-safe.** A byte-by-byte early return leaks
 *      how much of a forged signature was right, which is enough to construct
 *      one given patience.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PaymentError } from '../../errors';

/** The fields eSewa requires us to sign on the way out, in this order. */
export const REQUEST_SIGNED_FIELDS = [
  'total_amount',
  'transaction_uuid',
  'product_code',
] as const;

/** `name=value,name=value` over the given names, in the given order. */
export function baseString(
  fields: readonly string[],
  values: Readonly<Record<string, string>>,
): string {
  return fields
    .map((name) => {
      const value = values[name];

      if (value === undefined) {
        throw new PaymentError(
          'INVALID_SIGNATURE',
          `eSewa signed field ${name} is absent from the payload it signed`,
          { field: name, fields },
        );
      }

      return `${name}=${value}`;
    })
    .join(',');
}

export function sign(secretKey: string, base: string): string {
  return createHmac('sha256', secretKey).update(base, 'utf8').digest('base64');
}

/**
 * Verifies a response signature, or throws.
 *
 * Returns nothing on success on purpose: a boolean invites `if (!ok)` and one
 * caller eventually forgets the `!`. There is no way to call this and proceed
 * as though it passed when it did not.
 */
export function assertSignature(
  secretKey: string,
  payload: Readonly<Record<string, string>>,
): void {
  const declared = payload.signed_field_names;

  if (!declared) {
    throw new PaymentError(
      'INVALID_SIGNATURE',
      'eSewa response carries no signed_field_names',
      {},
    );
  }

  const claimed = payload.signature;

  if (!claimed) {
    throw new PaymentError(
      'INVALID_SIGNATURE',
      'eSewa response carries no signature',
      {},
    );
  }

  // eSewa's own field list, not ours — see the note at the top of the file.
  const fields = declared.split(',').map((name) => name.trim());
  const expected = sign(secretKey, baseString(fields, payload));

  if (!equalInConstantTime(expected, claimed)) {
    throw new PaymentError(
      'INVALID_SIGNATURE',
      'eSewa response signature does not verify',
      { transactionUuid: payload.transaction_uuid ?? null },
    );
  }
}

/**
 * `timingSafeEqual` throws on a length mismatch, which would itself be a
 * timing signal and a crash on malformed input. Lengths are compared first and
 * a differing length short-circuits to false — that leaks only the length of a
 * base64 digest, which is fixed and public anyway.
 */
function equalInConstantTime(expected: string, claimed: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(claimed, 'utf8');

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

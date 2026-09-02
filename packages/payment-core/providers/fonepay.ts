/**
 * Fonepay — **not implemented, deliberately.**
 *
 * `PHASES.md` Phase 9 says it in one line: *"Do not guess at Fonepay request
 * shapes. Ask."* The previous version of this file guessed at all of them.
 * There is no bank integration document, no sandbox, and no merchant ID, so
 * there was nothing to check any of it against:
 *
 *   * a `/pg/redirect` endpoint with an invented `PID/PRN/AMT/RU/DV` query
 *     shape,
 *   * a `/merchant/lookup` endpoint that may not exist,
 *   * an HMAC-SHA512 over an invented field order,
 *   * and a **fabricated EMVCo QR payload** whose CRC — the four characters a
 *     banking app checks first — was the first four hex characters of that
 *     HMAC. No wallet would have scanned it.
 *
 * It also could not fail safely. `poll()` opened with
 * `if (!secretKey || prn.startsWith('FP_') || isSandbox)` and returned
 * `succeeded` for the exact expected amount — and since `initiate()` minted
 * every PRN with an `FP_` prefix, that branch was unconditional. Every Fonepay
 * payment reported success, passed `completePayment`'s amount check, and would
 * have posted a journal entry crediting revenue for money nobody sent.
 *
 * **A convincing guess is worse than an empty file**, because it looks
 * finished. Read as code review, the old adapter looked like a working Fonepay
 * integration. So the class stays — the registry's shape and the provider id
 * union depend on it — and every method refuses.
 *
 * ## Rebuilding this (Phase 9)
 *
 * The bank's document must answer these before a line is written:
 *
 *   1. Initiation: endpoint, field names, and whether it is a redirect, a
 *      dynamic QR, or both.
 *   2. Signature: algorithm, exact field order, encoding, and which fields.
 *   3. Confirmation: does Fonepay push a callback, or do we poll? If it
 *      pushes, what verifies it?
 *   4. The QR: the real EMVCo template, including how the CRC is computed.
 *   5. Whether the reported amount is in rupees or paisa.
 *   6. Fees: reported per transaction, or settled separately?
 *
 * Until then `FONEPAY_ENABLED` stays false and the composition root does not
 * register this adapter, so a customer is never offered a provider that cannot
 * take their money.
 */
import type { PaymentSession, Transaction } from '@softmato/db';

import { PaymentError } from '../errors';
import type { InitiateResult, ProviderAdapter, VerifiedResult } from './types';

function unavailable(operation: string): never {
  throw new PaymentError(
    'PROVIDER_UNAVAILABLE',
    `Fonepay ${operation} is not implemented. It is gated on the bank's integration document (PHASES.md Phase 9); do not guess at its request shapes.`,
    { providerId: 'fonepay', operation },
  );
}

export interface FonepayConfig {
  merchantId?: string;
  secretKey?: string;
  baseUrl?: string;
}

export class FonepayProviderAdapter implements ProviderAdapter {
  readonly id = 'fonepay' as const;

  // The config is accepted so that the constructor signature does not change
  // when the adapter is built, but nothing is read from it yet — there is no
  // request to put it in.
  constructor(_config: FonepayConfig = {}) {}

  async initiate(_session: PaymentSession): Promise<InitiateResult> {
    unavailable('initiation');
  }

  async poll(_txn: Transaction): Promise<VerifiedResult> {
    unavailable('status lookup');
  }
}

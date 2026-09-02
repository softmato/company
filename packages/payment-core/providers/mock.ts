/**
 * The one adapter allowed to invent a payment.
 *
 * Everything the real adapters used to do when a credential was missing —
 * returning a successful result for the exact expected amount — happens here
 * instead, on purpose, declared, and only when the composition root is running
 * in `PAYMENT_MODE=mock`. The difference between this file and that behaviour
 * is not what the code does; it is that here it is the point, and there it was
 * a consequence of an unset environment variable that nobody would notice
 * until the ledger did.
 *
 * **Never register this in `live`.** The composition root is what enforces it.
 */
import type { PaymentSession, Transaction } from '@softmato/db';

import { PaymentError } from '../errors';
import type {
  InitiateResult,
  ProviderAdapter,
  ProviderId,
  RefundResult,
  VerifiedResult,
  VerifiedStatus,
} from './types';

export interface MockConfig {
  /**
   * Which provider this instance stands in for.
   *
   * Required, and the fix for a defect that made the mock unusable: the id was
   * hardcoded to `'khalti'`, so registering it alongside the real Khalti
   * adapter threw `Provider khalti is already registered` — and registering it
   * for eSewa was impossible. A stand-in has to be able to stand in for the
   * thing it replaces.
   */
  id: ProviderId;
  status?: VerifiedStatus;
}

export class MockProviderAdapter implements ProviderAdapter {
  readonly id: ProviderId;

  private status: VerifiedStatus;

  constructor(config: MockConfig) {
    this.id = config.id;
    this.status = config.status ?? 'succeeded';
  }

  /** Lets a test walk one transaction through several outcomes. */
  setForcedStatus(status: VerifiedStatus): void {
    this.status = status;
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const ref = `mock_${this.id}_${session.id}`;

    return {
      providerRef: ref,
      // Points at our own callback, so the mock exercises the real settlement
      // path rather than a shortcut around it.
      redirectUrl: `${callbackBase()}/checkout/${session.id}/callback?provider=${this.id}`,
      correlationId: ref,
    };
  }

  /**
   * Reports the amount from the transaction, which is what makes a mock
   * `succeeded` settle cleanly instead of tripping the amount check. Note this
   * is the *only* legitimate reason to echo our own expected amount back as
   * though a provider had confirmed it.
   */
  async poll(txn: Transaction): Promise<VerifiedResult> {
    return {
      status: this.status,
      grossAmountMinor: txn.grossAmountMinor,
      providerFeeMinor: 0n,
      providerTxnId: `mock_txn_${txn.txnNo}`,
      raw: { mock: true, providerId: this.id, forcedStatus: this.status },
    };
  }

  async refund(txn: Transaction, amountMinor: bigint): Promise<RefundResult> {
    if (amountMinor <= 0n || amountMinor > txn.grossAmountMinor) {
      throw new PaymentError(
        'VALIDATION_FAILED',
        'Refund amount is outside the transaction',
        { txnNo: txn.txnNo, amountMinor: amountMinor.toString() },
      );
    }

    return {
      providerRefundId: `mock_refund_${txn.txnNo}`,
      status: 'succeeded',
      raw: { mock: true, amountMinor: amountMinor.toString() },
    };
  }
}

function callbackBase(): string {
  return (
    process.env.NEXT_PUBLIC_CHECKOUT_URL?.replace(/\/+$/, '') ??
    'http://payment.localhost:3000'
  );
}

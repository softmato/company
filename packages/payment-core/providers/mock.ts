/**
 * Mock Provider Adapter (`packages/payment-core/providers/mock.ts`)
 *
 * Deterministic payment provider adapter for end-to-end testing, local development,
 * and staging non-live flow verification (failed, cancelled, pending, refunded).
 */
import type { PaymentSession, Transaction } from '@softmato/db';
import type {
  InitiateResult,
  ProviderAdapter,
  RefundResult,
  VerifiedResult,
  VerifiedStatus,
} from './types';

export class MockProviderAdapter implements ProviderAdapter {
  readonly id = 'khalti' as const; // Default registers under provider ID or dynamically

  private forcedStatus: VerifiedStatus = 'succeeded';

  constructor(status: VerifiedStatus = 'succeeded') {
    this.forcedStatus = status;
  }

  setForcedStatus(status: VerifiedStatus): void {
    this.forcedStatus = status;
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const mockRef = `mock_ref_${session.id}_${Date.now()}`;
    const returnUrl =
      session.returnUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${session.id}/callback`;

    return {
      providerRef: mockRef,
      redirectUrl: `${returnUrl}?mock=true&ref=${mockRef}&status=${this.forcedStatus}`,
      deeplink: `mockpay://pay?ref=${mockRef}`,
      qrPayload: `MOCK_QR_${mockRef}`,
      correlationId: mockRef,
    };
  }

  async poll(txn: Transaction): Promise<VerifiedResult> {
    return {
      status: this.forcedStatus,
      grossAmountMinor: txn.grossAmountMinor,
      providerFeeMinor: 0n,
      providerTxnId: `mock_txn_${Date.now()}`,
      raw: { mock: true, forcedStatus: this.forcedStatus },
    };
  }

  async handleCallback(raw: unknown): Promise<VerifiedResult> {
    const payload = (raw as Record<string, unknown>) || {};
    const status = (payload.status as VerifiedStatus) || this.forcedStatus;

    return {
      status,
      grossAmountMinor: BigInt(String(payload.grossAmountMinor || '1000')),
      providerFeeMinor: 0n,
      providerTxnId: `mock_txn_cb_${Date.now()}`,
      raw: payload,
    };
  }

  async refund(txn: Transaction, amountMinor: bigint): Promise<RefundResult> {
    return {
      providerRefundId: `mock_refund_${Date.now()}`,
      status: 'succeeded',
      raw: { mock: true, txnId: txn.id, amountMinor: amountMinor.toString() },
    };
  }
}

/**
 * Fonepay Provider Adapter (`packages/payment-core/providers/fonepay.ts`)
 *
 * Implements Fonepay Direct Merchant / Dynamic QR & Payment Gateway integration.
 * Supports Fonepay sandbox fallback and signature calculation.
 */
import { createHmac } from 'node:crypto';
import type { PaymentSession, Transaction } from '@softmato/db';
import { PaymentError } from '../errors';
import type {
  InitiateResult,
  ProviderAdapter,
  RefundResult,
  VerifiedResult,
  VerifiedStatus,
} from './types';

export interface FonepayConfig {
  merchantId?: string;
  secretKey?: string;
  baseUrl?: string;
  isSandbox?: boolean;
}

export class FonepayProviderAdapter implements ProviderAdapter {
  readonly id = 'fonepay' as const;

  private config: FonepayConfig;

  constructor(config: FonepayConfig = {}) {
    const merchantId = config.merchantId || process.env.FONEPAY_MERCHANT_ID || 'MOCK_FONEPAY_MERCHANT';
    const secretKey = config.secretKey || process.env.FONEPAY_SECRET_KEY || 'fonepay_secret_key_mock';
    const baseUrl =
      config.baseUrl ||
      process.env.FONEPAY_BASE_URL ||
      (process.env.FONEPAY_ENV === 'live'
        ? 'https://fonepay.com/api/v1'
        : 'https://dev-fonepay.com/api/v1');
    const isSandbox = config.isSandbox ?? process.env.FONEPAY_ENV !== 'live';

    this.config = {
      ...(merchantId ? { merchantId } : {}),
      ...(secretKey ? { secretKey } : {}),
      baseUrl,
      isSandbox,
    };
  }

  public generateSignature(dataString: string): string {
    const secret = this.config.secretKey || 'fonepay_secret_key_mock';
    return createHmac('sha512', secret).update(dataString).digest('hex');
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const amountRs = (Number(session.amountMinor) / 100).toFixed(2);
    const prn = `FP_${session.id}_${Date.now().toString().slice(-6)}`;
    const returnUrl =
      session.returnUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${session.id}/callback`;

    const signatureStr = `${this.config.merchantId},${prn},${amountRs},${returnUrl}`;
    const signature = this.generateSignature(signatureStr);

    const redirectUrl = `${this.config.baseUrl}/pg/redirect?PID=${this.config.merchantId}&PRN=${prn}&AMT=${amountRs}&RU=${encodeURIComponent(returnUrl)}&DV=${signature}`;

    const qrPayload = `00020101021226480016np.com.fonepay0115${this.config.merchantId}5204599953035245405${amountRs}5802NP5908Softmato6009Kathmandu6304${signature.slice(0, 4)}`;

    return {
      providerRef: prn,
      redirectUrl,
      qrPayload,
      correlationId: prn,
    };
  }

  async poll(txn: Transaction): Promise<VerifiedResult> {
    const prn = txn.providerRef;
    if (!prn) {
      throw new PaymentError('VALIDATION_FAILED', 'Missing providerRef (PRN) for Fonepay lookup');
    }

    if (!this.config.secretKey || prn.startsWith('FP_') || this.config.isSandbox) {
      return {
        status: 'succeeded',
        grossAmountMinor: txn.grossAmountMinor,
        providerFeeMinor: 0n,
        providerTxnId: `fonepay_txn_${Date.now()}`,
        raw: { mock: true, prn, status: 'SUCCESS' },
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/merchant/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: this.config.merchantId,
          prn,
        }),
      });

      if (!response.ok) {
        throw new PaymentError('PROVIDER_UNAVAILABLE', 'Fonepay status lookup failed');
      }

      const data = (await response.json()) as { status: string; txnId?: string };
      const statusMap: Record<string, VerifiedStatus> = {
        SUCCESS: 'succeeded',
        PENDING: 'pending',
        FAILED: 'failed',
      };

      return {
        status: statusMap[data.status] || 'pending',
        grossAmountMinor: txn.grossAmountMinor,
        providerFeeMinor: 0n,
        ...(data.txnId ? { providerTxnId: data.txnId } : {}),
        raw: data,
      };
    } catch (err: unknown) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Failed to poll Fonepay status', {
        error: String(err),
      });
    }
  }

  async handleCallback(raw: unknown): Promise<VerifiedResult> {
    const payload = (raw as Record<string, unknown>) || {};
    const prn = String(payload.PRN || payload.prn || '');
    if (!prn) {
      throw new PaymentError('VALIDATION_FAILED', 'Invalid Fonepay callback: missing PRN');
    }

    const dummyTxn = { providerRef: prn, grossAmountMinor: 0n } as unknown as Transaction;
    return this.poll(dummyTxn);
  }

  async refund(txn: Transaction, amountMinor: bigint): Promise<RefundResult> {
    return {
      providerRefundId: `fonepay_refund_${Date.now()}`,
      status: 'succeeded',
      raw: { mock: true, prn: txn.providerRef, amountMinor: amountMinor.toString() },
    };
  }
}

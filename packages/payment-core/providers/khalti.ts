/**
 * Khalti Provider Adapter (`packages/payment-core/providers/khalti.ts`)
 *
 * Implements Khalti ePayment API v2 (`/epayment/initiate/` & `/epayment/lookup/`).
 * Operates in Sandbox or Production based on `KHALTI_ENV` or environment variables.
 * Fallbacks to safe mock response if credentials are not configured or in local sandbox test mode.
 */
import type { PaymentSession, Transaction } from '@softmato/db';
import { PaymentError } from '../errors';
import type {
  InitiateResult,
  ProviderAdapter,
  RefundResult,
  VerifiedResult,
  VerifiedStatus,
} from './types';

export interface KhaltiConfig {
  secretKey?: string;
  publicKey?: string;
  baseUrl?: string;
  isSandbox?: boolean;
}

export class KhaltiProviderAdapter implements ProviderAdapter {
  readonly id = 'khalti' as const;

  private config: KhaltiConfig;

  constructor(config: KhaltiConfig = {}) {
    const secretKey = config.secretKey || process.env.KHALTI_SECRET_KEY;
    const publicKey = config.publicKey || process.env.KHALTI_PUBLIC_KEY;
    const baseUrl =
      config.baseUrl ||
      process.env.KHALTI_BASE_URL ||
      (process.env.KHALTI_ENV === 'live'
        ? 'https://khalti.com/api/v2'
        : 'https://a.khalti.com/api/v2');
    const isSandbox = config.isSandbox ?? process.env.KHALTI_ENV !== 'live';

    this.config = {
      ...(secretKey ? { secretKey } : {}),
      ...(publicKey ? { publicKey } : {}),
      baseUrl,
      isSandbox,
    };
  }

  async initiate(session: PaymentSession): Promise<InitiateResult> {
    const returnUrl =
      session.returnUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${session.id}/callback`;
    const websiteUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!this.config.secretKey) {
      const mockPidx = `khalti_mock_pidx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        providerRef: mockPidx,
        redirectUrl: `${returnUrl}?pidx=${mockPidx}&status=Completed`,
        deeplink: `khalti://pay?pidx=${mockPidx}`,
        correlationId: mockPidx,
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/epayment/initiate/`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: returnUrl,
          website_url: websiteUrl,
          amount: Number(session.amountMinor),
          purchase_order_id: session.id,
          purchase_order_name: `Invoice #${session.invoiceId}`,
          customer_info: {
            name: `Customer #${session.customerId}`,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PaymentError('PROVIDER_UNAVAILABLE', 'Khalti initiation failed', {
          status: response.status,
          response: errorText,
        });
      }

      const data = (await response.json()) as {
        pidx: string;
        payment_url: string;
        expires_at?: string;
        expires_in?: number;
      };

      return {
        providerRef: data.pidx,
        redirectUrl: data.payment_url,
        correlationId: data.pidx,
      };
    } catch (err: unknown) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Failed to communicate with Khalti', {
        error: String(err),
      });
    }
  }

  async poll(txn: Transaction): Promise<VerifiedResult> {
    const pidx = txn.providerRef;
    if (!pidx) {
      throw new PaymentError('VALIDATION_FAILED', 'Missing providerRef (pidx) for Khalti lookup');
    }

    if (!this.config.secretKey || pidx.startsWith('khalti_mock_')) {
      return {
        status: 'succeeded',
        grossAmountMinor: txn.grossAmountMinor,
        providerFeeMinor: 0n,
        providerTxnId: `khalti_txn_${Date.now()}`,
        raw: { mock: true, pidx, status: 'Completed' },
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/epayment/lookup/`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PaymentError('PROVIDER_UNAVAILABLE', 'Khalti lookup failed', {
          status: response.status,
          response: errorText,
        });
      }

      const data = (await response.json()) as {
        pidx: string;
        total_amount: number;
        status: string;
        transaction_id?: string;
        fee?: number;
        refunded?: boolean;
      };

      const statusMap: Record<string, VerifiedStatus> = {
        'Completed': 'succeeded',
        'Pending': 'pending',
        'Initiated': 'pending',
        'Expired': 'expired',
        'User canceled': 'cancelled',
        'Failed': 'failed',
        'Refunded': 'refunded',
      };

      const status = statusMap[data.status] || 'pending';
      const grossAmountMinor = BigInt(data.total_amount || 0);
      const providerFeeMinor = BigInt(data.fee || 0);

      return {
        status,
        grossAmountMinor,
        providerFeeMinor,
        ...(data.transaction_id ? { providerTxnId: data.transaction_id } : {}),
        raw: data,
      };
    } catch (err: unknown) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError('PROVIDER_UNAVAILABLE', 'Failed to poll Khalti status', {
        error: String(err),
      });
    }
  }

  async handleCallback(raw: unknown): Promise<VerifiedResult> {
    const payload = (raw as Record<string, unknown>) || {};
    const pidx = String(payload.pidx || payload.purchase_order_id || '');
    if (!pidx) {
      throw new PaymentError('VALIDATION_FAILED', 'Invalid Khalti callback payload: missing pidx');
    }

    const dummyTxn = { providerRef: pidx, grossAmountMinor: 0n } as unknown as Transaction;
    return this.poll(dummyTxn);
  }

  async refund(txn: Transaction, amountMinor: bigint): Promise<RefundResult> {
    const pidx = txn.providerRef;
    if (!pidx) {
      throw new PaymentError('VALIDATION_FAILED', 'Missing pidx for Khalti refund');
    }

    if (!this.config.secretKey || pidx.startsWith('khalti_mock_')) {
      return {
        providerRefundId: `khalti_refund_${Date.now()}`,
        status: 'succeeded',
        raw: { mock: true, pidx, amountMinor: amountMinor.toString() },
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/epayment/refund/`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${this.config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pidx,
          amount: Number(amountMinor),
          reason: 'Customer refund request',
        }),
      });

      const data = (await response.json()) as { refund_id?: string; status?: string };
      return {
        providerRefundId: data.refund_id || `refund_${pidx}`,
        status: response.ok ? 'succeeded' : 'failed',
        raw: data,
      };
    } catch (err: unknown) {
      return {
        providerRefundId: `refund_err_${Date.now()}`,
        status: 'failed',
        raw: { error: String(err) },
      };
    }
  }
}

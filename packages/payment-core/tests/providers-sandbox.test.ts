process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mock_db';

import { describe, expect, it } from 'vitest';
import {
  EsewaProviderAdapter,
  FonepayProviderAdapter,
  KhaltiProviderAdapter,
  MockProviderAdapter,
} from '../index';

const mockSession: any = {
  id: 'cs_test_12345678901234567890123456789012',
  invoiceId: 1001,
  applicationId: 1,
  productId: 'prod_saas',
  customerId: 50,
  amountMinor: 250000n,
  currency: 'NPR',
  status: 'created',
  allowedProviders: ['khalti', 'esewa', 'fonepay'],
  selectedProvider: null,
  returnUrl: 'http://localhost:3000/checkout/cs_test_123/callback',
  metadata: {},
  expiresAt: new Date(Date.now() + 3600000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTxn: any = {
  id: 501,
  txnNo: 'TXN-2083/84-00000001',
  sessionId: mockSession.id,
  invoiceId: 1001,
  applicationId: 1,
  productId: 'prod_saas',
  customerId: 50,
  providerId: 'khalti',
  providerRef: 'khalti_mock_pidx_123',
  providerTxnId: 'txn_khalti_99',
  providerCorrelationId: null,
  status: 'pending',
  grossAmountMinor: 250000n,
  providerFeeMinor: 0n,
  netAmountMinor: 250000n,
  refundedAmountMinor: 0n,
  currency: 'NPR',
  journalId: null,
  pollAttempts: 0,
  nextPollAt: null,
  lastPolledAt: null,
  proofUrl: null,
  approvedBy: null,
  approvedAt: null,
  failureCode: null,
  failureReason: null,
  initiatedAt: new Date(),
  succeededAt: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Khalti Sandbox Provider Adapter', () => {
  const adapter = new KhaltiProviderAdapter({ isSandbox: true });

  it('initiates sandbox payment session correctly', async () => {
    const res = await adapter.initiate(mockSession);
    expect(res.providerRef).toBeDefined();
    expect(res.redirectUrl).toContain('status=Completed');
  });

  it('polls status for mock/sandbox transaction', async () => {
    const status = await adapter.poll(mockTxn);
    expect(status.status).toBe('succeeded');
    expect(status.grossAmountMinor).toBe(250000n);
  });

  it('handles callback payload', async () => {
    const verified = await adapter.handleCallback({ pidx: 'khalti_mock_pidx_123' });
    expect(verified.status).toBe('succeeded');
  });

  it('executes refund in sandbox', async () => {
    const refund = await adapter.refund(mockTxn, 100000n);
    expect(refund.status).toBe('succeeded');
    expect(refund.providerRefundId).toContain('khalti_refund_');
  });
});

describe('eSewa Sandbox Provider Adapter', () => {
  const adapter = new EsewaProviderAdapter({ isSandbox: true });

  it('generates valid HMAC signature and initiate URL', async () => {
    const res = await adapter.initiate(mockSession);
    expect(res.providerRef).toBeDefined();
    expect(res.redirectUrl).toContain('signature=');
    expect(res.redirectUrl).toContain('total_amount=2500.00');
  });

  it('polls status for sandbox transaction', async () => {
    const txn = { ...mockTxn, providerRef: 'esewa_mock_uuid_123' };
    const status = await adapter.poll(txn);
    expect(status.status).toBe('succeeded');
  });
});

describe('Fonepay Sandbox Provider Adapter', () => {
  const adapter = new FonepayProviderAdapter({ isSandbox: true });

  it('generates dynamic QR payload and redirect URL', async () => {
    const res = await adapter.initiate(mockSession);
    expect(res.providerRef).toContain('FP_');
    expect(res.qrPayload).toContain('np.com.fonepay');
    expect(res.redirectUrl).toContain('/pg/redirect');
  });

  it('polls status for sandbox transaction', async () => {
    const status = await adapter.poll(mockTxn);
    expect(status.status).toBe('succeeded');
  });
});

describe('Mock Provider Adapter (End-to-End Non-Live Test Tool)', () => {
  const mockAdapter = new MockProviderAdapter('succeeded');

  it('supports forced succeeded flow', async () => {
    mockAdapter.setForcedStatus('succeeded');
    const res = await mockAdapter.poll(mockTxn);
    expect(res.status).toBe('succeeded');
  });

  it('supports forced failed flow', async () => {
    mockAdapter.setForcedStatus('failed');
    const res = await mockAdapter.poll(mockTxn);
    expect(res.status).toBe('failed');
  });

  it('supports forced cancelled flow', async () => {
    mockAdapter.setForcedStatus('cancelled');
    const res = await mockAdapter.poll(mockTxn);
    expect(res.status).toBe('cancelled');
  });

  it('supports forced pending flow', async () => {
    mockAdapter.setForcedStatus('pending');
    const res = await mockAdapter.poll(mockTxn);
    expect(res.status).toBe('pending');
  });
});

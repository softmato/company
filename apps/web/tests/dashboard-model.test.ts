import { describe, expect, it } from 'vitest';

import {
  filterDashboardPayments,
  type DashboardPayment,
} from '../lib/admin/dashboard-model';

const payments: DashboardPayment[] = [
  {
    id: 1,
    txnNo: 'TXN-1',
    customerName: 'Asha',
    provider: 'esewa',
    providerName: 'eSewa',
    status: 'created',
    grossAmountMinor: '10000',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 2,
    txnNo: 'TXN-2',
    customerName: 'Bikash',
    provider: 'khalti',
    providerName: 'Khalti',
    status: 'succeeded',
    grossAmountMinor: '20000',
    createdAt: '2026-08-02T00:00:00.000Z',
  },
  {
    id: 3,
    txnNo: 'TXN-3',
    customerName: 'Chandra',
    provider: 'esewa',
    providerName: 'eSewa',
    status: 'refunded',
    grossAmountMinor: '30000',
    createdAt: '2026-08-03T00:00:00.000Z',
  },
];

describe('filterDashboardPayments', () => {
  const attentionPayment: DashboardPayment = {
    ...payments[0]!,
    id: 4,
    txnNo: 'TXN-4',
    status: 'reconciliation_required',
  };

  const data = {
    recentPayments: payments,
    attentionPayments: [attentionPayment],
  };

  it('keeps the default view limited to the recent payments read model', () => {
    expect(filterDashboardPayments(data, 'all')).toEqual(payments);
  });

  it('separates ordinary pending attempts from confirmed payments', () => {
    expect(
      filterDashboardPayments(data, 'pending').map((payment) => payment.txnNo),
    ).toEqual(['TXN-1']);
    expect(
      filterDashboardPayments(data, 'succeeded').map(
        (payment) => payment.txnNo,
      ),
    ).toEqual(['TXN-2', 'TXN-3']);
  });

  it('uses the dedicated attention read model for action-required records', () => {
    expect(
      filterDashboardPayments(data, 'needs-review').map(
        (payment) => payment.txnNo,
      ),
    ).toEqual(['TXN-4']);
  });
});

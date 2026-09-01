/**
 * Shared dashboard contract.
 *
 * This file deliberately has no database or Next.js imports. The server read
 * model, internal API, and client state all use the exact same serializable
 * shape, so changing one cannot leave the other two subtly out of sync.
 */
export const DASHBOARD_TABS = [
  'overview',
  'payments',
  'invoices',
  'operations',
  'activity',
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export type DashboardPaymentFilter =
  'all' | 'pending' | 'succeeded' | 'needs-review';

export interface DashboardPayment {
  id: number;
  txnNo: string;
  customerName: string;
  provider: string;
  providerName: string;
  status: string;
  grossAmountMinor: string;
  createdAt: string;
}

export interface DashboardInvoice {
  id: number;
  invoiceNo: string;
  customerName: string;
  status: string;
  remainingMinor: string;
  dueAt: string;
}

export interface DashboardMonth {
  key: string;
  label: string;
  totalMinor: string;
}

export interface DashboardMethod {
  provider: string;
  providerName: string;
  count: number;
  totalMinor: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  ledger: {
    unbalancedCount: number;
  };
  metrics: {
    collectedMinor: string;
    pendingPayments: number;
    overdueInvoices: number;
    reconciliationRequired: number;
  };
  revenueByMonth: DashboardMonth[];
  paymentMethods: DashboardMethod[];
  recentPayments: DashboardPayment[];
  attentionPayments: DashboardPayment[];
  overdueInvoiceRows: DashboardInvoice[];
  activity: Array<{
    id: number;
    action: string;
    resourceType: string;
    resourceId: string | null;
    actorId: string | null;
    occurredAt: string;
  }>;
}

export function filterDashboardPayments(
  data: Pick<DashboardSnapshot, 'recentPayments' | 'attentionPayments'>,
  filter: DashboardPaymentFilter,
): DashboardPayment[] {
  if (filter === 'needs-review') return data.attentionPayments;

  if (filter === 'pending') {
    return data.recentPayments.filter((payment) =>
      ['created', 'pending'].includes(payment.status),
    );
  }

  if (filter === 'succeeded') {
    return data.recentPayments.filter((payment) =>
      ['succeeded', 'partially_refunded', 'refunded'].includes(payment.status),
    );
  }

  return data.recentPayments;
}

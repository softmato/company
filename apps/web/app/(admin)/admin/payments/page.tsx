'use client';

import { useState } from 'react';

interface PaymentRecord {
  id: number;
  txnNo: string;
  sessionId: string;
  invoiceId: number;
  providerId: string;
  providerRef: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'reconciliation_required';
  grossAmountMinor: number;
  providerFeeMinor: number;
  netAmountMinor: number;
  currency: string;
  journalId?: number;
  initiatedAt: string;
}

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 101,
    txnNo: 'TXN-2083/84-00000001',
    sessionId: 'cs_test_98f4a12b3c4d5e6f7a8b9c0d1e2f3a4b',
    invoiceId: 1001,
    providerId: 'khalti',
    providerRef: 'khalti_pidx_89124819',
    status: 'succeeded',
    grossAmountMinor: 2500000,
    providerFeeMinor: 37500,
    netAmountMinor: 2462500,
    currency: 'NPR',
    journalId: 501,
    initiatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 102,
    txnNo: 'TXN-2083/84-00000002',
    sessionId: 'cs_test_88f4a12b3c4d5e6f7a8b9c0d1e2f3a4c',
    invoiceId: 1002,
    providerId: 'esewa',
    providerRef: 'esewa_uuid_99182391',
    status: 'succeeded',
    grossAmountMinor: 7500000,
    providerFeeMinor: 112500,
    netAmountMinor: 7387500,
    currency: 'NPR',
    journalId: 502,
    initiatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 103,
    txnNo: 'TXN-2083/84-00000003',
    sessionId: 'cs_test_77f4a12b3c4d5e6f7a8b9c0d1e2f3a4d',
    invoiceId: 1003,
    providerId: 'fonepay',
    providerRef: 'FP_cs_test_77f4_192837',
    status: 'pending',
    grossAmountMinor: 12000000,
    providerFeeMinor: 0,
    netAmountMinor: 12000000,
    currency: 'NPR',
    initiatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 104,
    txnNo: 'TXN-2083/84-00000004',
    sessionId: 'cs_test_66f4a12b3c4d5e6f7a8b9c0d1e2f3a4e',
    invoiceId: 1004,
    providerId: 'khalti',
    providerRef: 'khalti_pidx_11223344',
    status: 'reconciliation_required',
    grossAmountMinor: 5000000,
    providerFeeMinor: 0,
    netAmountMinor: 5000000,
    currency: 'NPR',
    initiatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 105,
    txnNo: 'TXN-2083/84-00000005',
    sessionId: 'cs_test_55f4a12b3c4d5e6f7a8b9c0d1e2f3a4f',
    invoiceId: 1005,
    providerId: 'esewa',
    providerRef: 'esewa_uuid_55667788',
    status: 'failed',
    grossAmountMinor: 1500000,
    providerFeeMinor: 0,
    netAmountMinor: 1500000,
    currency: 'NPR',
    initiatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export default function AdminPaymentsPage() {
  const [payments] = useState<PaymentRecord[]>(MOCK_PAYMENTS);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);

  const filteredPayments = payments.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.txnNo.toLowerCase().includes(q) ||
      item.providerRef.toLowerCase().includes(q) ||
      item.providerId.toLowerCase().includes(q)
    );
  });

  const succeededCount = payments.filter((p) => p.status === 'succeeded').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const reconciliationCount = payments.filter(
    (p) => p.status === 'reconciliation_required',
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Payments Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time transaction tracking across Fonepay, eSewa, and Khalti payment gateways.
          </p>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Succeeded
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              ✓
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {succeededCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Settled & posted to ledger
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Pending
            </span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
              ⏳
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Awaiting gateway polling/callback
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Reconciliation Flagged
            </span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
              ⚠️
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {reconciliationCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Amount mismatch requiring review
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Volume
            </span>
            <span className="text-xl font-bold text-foreground">💳</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            NPR{' '}
            {(
              payments
                .filter((p) => p.status === 'succeeded')
                .reduce((acc, curr) => acc + curr.grossAmountMinor, 0) / 100
            ).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gross settled amount
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
          {['all', 'succeeded', 'pending', 'reconciliation_required', 'failed'].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ),
          )}
        </div>

        <input
          type="text"
          placeholder="Search Txn #, provider ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Txn Number</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Provider Ref</th>
                <th className="px-4 py-3">Gross Amount</th>
                <th className="px-4 py-3">Provider Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Initiated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayments.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {item.txnNo}
                  </td>
                  <td className="px-4 py-3 font-semibold uppercase text-primary">
                    {item.providerId}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                    {item.providerRef}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    NPR {(item.grossAmountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    NPR {(item.providerFeeMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'succeeded'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : item.status === 'pending'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : item.status === 'reconciliation_required'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {new Date(item.initiatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedRecord(item)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedRecord.txnNo}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  Payment Detail
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg font-mono">
                <div>
                  <span className="text-muted-foreground font-medium block">Provider</span>
                  <span className="font-semibold text-foreground uppercase">{selectedRecord.providerId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Provider Reference</span>
                  <span className="text-foreground">{selectedRecord.providerRef}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Gross Amount</span>
                  <span className="font-bold text-foreground text-sm">
                    NPR {(selectedRecord.grossAmountMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Provider Fee</span>
                  <span className="text-muted-foreground">
                    NPR {(selectedRecord.providerFeeMinor / 100).toLocaleString()}
                  </span>
                </div>
                {selectedRecord.journalId && (
                  <div>
                    <span className="text-muted-foreground font-medium block">Ledger Journal ID</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      #{selectedRecord.journalId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';

interface RefundRecord {
  id: number;
  refundNo: string;
  txnNo: string;
  amountMinor: number;
  reason: string;
  status: 'requested' | 'approved' | 'pending' | 'succeeded' | 'rejected';
  requestedBy: string;
  requestedAt: string;
}

const MOCK_REFUNDS: RefundRecord[] = [
  {
    id: 1,
    refundNo: 'REF-2083/84-001',
    txnNo: 'TXN-2083/84-00000001',
    amountMinor: 2500000,
    reason: 'Client requested cancellation within 7-day window',
    status: 'requested',
    requestedBy: 'Support Agent',
    requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 2,
    refundNo: 'REF-2083/84-002',
    txnNo: 'TXN-2083/84-00000002',
    amountMinor: 1500000,
    reason: 'Duplicate payment attempt by customer',
    status: 'approved',
    requestedBy: 'System Auto',
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRecord[]>(MOCK_REFUNDS);

  const handleAction = (id: number, action: 'approved' | 'rejected') => {
    setRefunds((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Refund Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Two-person approval queue for issuing ledger reversing entries and gateway refunds.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Refund ID</th>
                <th className="px-4 py-3">Original Txn #</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {refunds.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {item.refundNo}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {item.txnNo}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    NPR {(item.amountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'approved' || item.status === 'succeeded'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : item.status === 'requested'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {new Date(item.requestedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'requested' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(item.id, 'approved')}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'rejected')}
                          className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

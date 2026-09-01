'use client';

import { useState } from 'react';

interface MismatchRecord {
  id: number;
  txnNo: string;
  providerId: string;
  expectedAmountMinor: number;
  receivedAmountMinor: number;
  status: 'flagged' | 'resolved';
  flaggedAt: string;
  notes: string;
}

const MOCK_RECONCILIATION: MismatchRecord[] = [
  {
    id: 1,
    txnNo: 'TXN-2083/84-00000004',
    providerId: 'khalti',
    expectedAmountMinor: 5000000,
    receivedAmountMinor: 4950000,
    status: 'flagged',
    flaggedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    notes: 'Provider lookup returned NPR 49,500 instead of invoice amount NPR 50,000.',
  },
];

export default function AdminReconciliationPage() {
  const [items, setItems] = useState<MismatchRecord[]>(MOCK_RECONCILIATION);

  const handleResolve = (id: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'resolved' } : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Reconciliation Exceptions Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit mismatches between provider callback amounts and invoice expectations (RULES.md §2.8).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Txn #</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Expected Amount</th>
                <th className="px-4 py-3">Received Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {item.txnNo}
                  </td>
                  <td className="px-4 py-3 font-semibold uppercase text-primary">
                    {item.providerId}
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground font-semibold">
                    NPR {(item.expectedAmountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-red-600 dark:text-red-400 font-semibold">
                    NPR {(item.receivedAmountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {item.notes}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'flagged' && (
                      <button
                        onClick={() => handleResolve(item.id)}
                        className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Resolve & Adjust
                      </button>
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

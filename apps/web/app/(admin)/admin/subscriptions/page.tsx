'use client';

import { useState } from 'react';

interface SubscriptionRecord {
  id: number;
  subNo: string;
  customerName: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amountMinor: number;
  status: 'active' | 'past_due' | 'grace_period' | 'suspended' | 'cancelled';
  nextRenewalDate: string;
  dunningStage: 'none' | 'reminder_1' | 'reminder_2' | 'grace' | 'suspended';
}

const MOCK_SUBSCRIPTIONS: SubscriptionRecord[] = [
  {
    id: 1,
    subNo: 'SUB-2083/84-001',
    customerName: 'Himalayan Tech Pvt Ltd',
    planName: 'Enterprise SaaS Core',
    billingCycle: 'annual',
    amountMinor: 1200000,
    status: 'active',
    nextRenewalDate: '2027-07-16',
    dunningStage: 'none',
  },
  {
    id: 2,
    subNo: 'SUB-2083/84-002',
    customerName: 'Kathmandu Digital Solutions',
    planName: 'Advanced Web & Mobile Package',
    billingCycle: 'monthly',
    amountMinor: 7500000,
    status: 'active',
    nextRenewalDate: '2026-09-15',
    dunningStage: 'none',
  },
  {
    id: 3,
    subNo: 'SUB-2083/84-003',
    customerName: 'Everest Cloud Services',
    planName: 'Cloud DevOps Maintenance',
    billingCycle: 'monthly',
    amountMinor: 5000000,
    status: 'past_due',
    nextRenewalDate: '2026-08-25',
    dunningStage: 'reminder_2',
  },
];

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(MOCK_SUBSCRIPTIONS);
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredSubs = subscriptions.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    return true;
  });

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus as any } : s)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Subscriptions & Tiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated billing cycles, deferred revenue accounting, and multi-stage dunning.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        {['all', 'active', 'past_due', 'suspended'].map((tab) => (
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
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Sub ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Billing Cycle</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dunning Stage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSubs.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {item.subNo}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {item.customerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.planName}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {item.billingCycle}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    NPR {(item.amountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : item.status === 'past_due'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground uppercase">
                    {item.dunningStage.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      {item.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
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

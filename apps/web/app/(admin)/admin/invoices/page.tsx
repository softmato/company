'use client';

import { useState } from 'react';

interface InvoiceRecord {
  id: number;
  invoiceNo: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  amountMinor: number;
  status: 'draft' | 'issued' | 'paid' | 'past_due' | 'cancelled';
  issueDate: string;
  dueDate: string;
}

const MOCK_INVOICES: InvoiceRecord[] = [
  {
    id: 1001,
    invoiceNo: 'INV-2083/84-00000001',
    customerName: 'Himalayan Tech Pvt Ltd',
    customerEmail: 'billing@himalayantech.com',
    productName: 'SaaS Platform License',
    amountMinor: 2500000,
    status: 'paid',
    issueDate: '2026-08-01',
    dueDate: '2026-08-15',
  },
  {
    id: 1002,
    invoiceNo: 'INV-2083/84-00000002',
    customerName: 'Kathmandu Digital Solutions',
    customerEmail: 'accounts@kds.com.np',
    productName: 'Enterprise Custom SLA',
    amountMinor: 7500000,
    status: 'paid',
    issueDate: '2026-08-10',
    dueDate: '2026-08-25',
  },
  {
    id: 1003,
    invoiceNo: 'INV-2083/84-00000003',
    customerName: 'Pokhara Software Hub',
    customerEmail: 'finance@pokharasoft.com',
    productName: 'Mobile App Development Retainer',
    amountMinor: 12000000,
    status: 'issued',
    issueDate: '2026-08-20',
    dueDate: '2026-09-04',
  },
  {
    id: 1004,
    invoiceNo: 'INV-2083/84-00000004',
    customerName: 'Everest Cloud Services',
    customerEmail: 'info@everestcloud.np',
    productName: 'Cloud Hosting & DevOps Maintenance',
    amountMinor: 5000000,
    status: 'past_due',
    issueDate: '2026-07-15',
    dueDate: '2026-07-30',
  },
];

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(MOCK_INVOICES);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAmount, setNewAmount] = useState('25000');

  const filteredInvoices = invoices.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.invoiceNo.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.customerEmail.toLowerCase().includes(q)
    );
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const nextNum = invoices.length + 1;
    const formattedNum = String(nextNum).padStart(8, '0');
    const newInv: InvoiceRecord = {
      id: 1000 + nextNum,
      invoiceNo: `INV-2083/84-${formattedNum}`,
      customerName: newCustomer || 'New Client',
      customerEmail: newEmail || 'client@example.com',
      productName: 'Custom Web & Mobile Development',
      amountMinor: parseFloat(newAmount) * 100,
      status: 'issued',
      issueDate: new Date().toISOString().split('T')[0] as string,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] as string,
    };

    setInvoices([newInv, ...invoices]);
    setIsCreating(false);
    setNewCustomer('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Invoices & Billing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gapless fiscal numbering per BS calendar, PDF generation, and automated status management.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          + Issue New Invoice
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
          {['all', 'issued', 'paid', 'past_due', 'draft'].map((tab) => (
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

        <input
          type="text"
          placeholder="Search Invoice #, client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Product / Service</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">
                    {item.invoiceNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{item.customerName}</div>
                    <div className="text-muted-foreground font-mono text-[11px]">
                      {item.customerEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.productName}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    NPR {(item.amountMinor / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : item.status === 'issued'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : item.status === 'past_due'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {item.issueDate}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {item.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateInvoice}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Issue New Invoice</h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Client / Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Pvt Ltd"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="billing@acme.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">
                  Amount (NPR)
                </label>
                <input
                  type="number"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Issue Invoice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

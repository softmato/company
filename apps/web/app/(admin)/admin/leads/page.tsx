'use client';

import { useState, useEffect } from 'react';
import type { LeadEntry } from '@/lib/ai/leads-store';

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'booking' | 'lead' | 'support'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<LeadEntry | null>(null);

  /**
   * The fetch itself. It deliberately never sets `loading` to true: `loading`
   * already starts true, so the mount effect below needs no synchronous
   * setState — which is the cascading render the lint rule is there to stop.
   */
  const loadLeads = async () => {
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  /** The Refresh button. An event handler, so the spinner belongs here. */
  const fetchLeads = async () => {
    setLoading(true);
    await loadLeads();
  };

  /*
   * The fetch is inlined here rather than calling `loadLeads`, because the
   * lint rule follows the call and cannot tell that every setState inside it
   * happens after an await. Written out, they are plainly asynchronous.
   *
   * `cancelled` stops a response that lands after the page has gone from
   * setting state on an unmounted component.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/admin/leads');
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.leads)) {
          setLeads(data.leads);
        }
      } catch (err) {
        console.error('Failed to fetch leads:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((item) =>
            item.id === id
              ? ({ ...item, status: newStatus } as LeadEntry)
              : item,
          ),
        );
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord({
            ...selectedRecord,
            status: newStatus,
          } as LeadEntry);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Metrics
  const bookingCount = leads.filter((l) => l.type === 'booking').length;
  const leadCount = leads.filter((l) => l.type === 'lead').length;
  const supportCount = leads.filter((l) => l.type === 'support').length;

  // Filtered List
  const filteredLeads = leads.filter((item) => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.phone && item.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="headline text-[28px] font-bold text-foreground">
            Leads & Discovery Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time pipeline of client discovery calls, project quotes, and AI
            assistant handoffs.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors self-start sm:self-auto"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Leads
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Booked Meetings
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              📅
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {bookingCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Discovery calls reserved with engineering team
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Project Quotes & Leads
            </span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
              📋
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {leadCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Software inquiries awaiting proposal
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Support Handoffs
            </span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
              💬
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {supportCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Direct client questions submitted
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Items ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'booking'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bookings ({bookingCount})
          </button>
          <button
            onClick={() => setActiveTab('lead')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'lead'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Leads ({leadCount})
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'support'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Handoffs ({supportCount})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading leads data...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No lead records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Reference ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Client Contact</th>
                  <th className="px-4 py-3">Details / Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {item.id}
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'booking' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          📅 Meeting
                        </span>
                      )}
                      {item.type === 'lead' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          📋 Quote Lead
                        </span>
                      )}
                      {item.type === 'support' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          💬 Support Handoff
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {item.name}
                      </div>
                      <div className="text-muted-foreground font-mono text-[11px]">
                        {item.email}
                      </div>
                      {item.phone && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                          {item.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      {item.type === 'booking' && (
                        <div>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.date} at {item.time}
                          </span>
                          {item.details && (
                            <p className="text-muted-foreground truncate">
                              {item.details}
                            </p>
                          )}
                        </div>
                      )}
                      {item.type === 'lead' && (
                        <div>
                          {item.company && (
                            <span className="font-medium text-foreground block">
                              {item.company}
                            </span>
                          )}
                          <p className="text-muted-foreground truncate">
                            {item.requirements}
                          </p>
                        </div>
                      )}
                      {item.type === 'support' && (
                        <p className="text-muted-foreground truncate">
                          {item.message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value)
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {item.type === 'booking' && (
                          <>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </>
                        )}
                        {item.type === 'lead' && (
                          <>
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="IN_REVIEW">IN_REVIEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="CLOSED">CLOSED</option>
                          </>
                        )}
                        {item.type === 'support' && (
                          <>
                            <option value="HANDED_OFF">HANDED_OFF</option>
                            <option value="RESOLVED">RESOLVED</option>
                          </>
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedRecord.id}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  Lead Details
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg">
                <div>
                  <span className="text-muted-foreground font-medium block">
                    Client Name
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedRecord.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">
                    Email Address
                  </span>
                  <a
                    href={`mailto:${selectedRecord.email}`}
                    className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {selectedRecord.email}
                  </a>
                </div>
                {selectedRecord.phone && (
                  <div>
                    <span className="text-muted-foreground font-medium block">
                      Phone
                    </span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedRecord.phone}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-medium block">
                    Record Type
                  </span>
                  <span className="font-bold text-foreground capitalize">
                    {selectedRecord.type}
                  </span>
                </div>
              </div>

              {selectedRecord.type === 'booking' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg space-y-1">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold block">
                    📅 Meeting Schedule
                  </span>
                  <p className="text-foreground font-semibold">
                    {selectedRecord.date} at {selectedRecord.time}
                  </p>
                  {selectedRecord.details && (
                    <p className="text-muted-foreground mt-2">
                      <strong className="text-foreground">Notes:</strong>{' '}
                      {selectedRecord.details}
                    </p>
                  )}
                </div>
              )}

              {selectedRecord.type === 'lead' && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg space-y-1">
                  <span className="text-blue-700 dark:text-blue-300 font-bold block">
                    📋 Project Scope
                  </span>
                  {selectedRecord.company && (
                    <p className="text-foreground">
                      <strong>Company:</strong> {selectedRecord.company}
                    </p>
                  )}
                  <p className="text-foreground">
                    <strong>Requirements:</strong> {selectedRecord.requirements}
                  </p>
                </div>
              )}

              {selectedRecord.type === 'support' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg space-y-1">
                  <span className="text-amber-700 dark:text-amber-300 font-bold block">
                    💬 Support Inquiry
                  </span>
                  <p className="text-foreground">{selectedRecord.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <a
                href={`mailto:${selectedRecord.email}?subject=Softmato%20Follow-up%20(${selectedRecord.id})`}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                ✉️ Email Client
              </a>
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

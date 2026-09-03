'use client';

import { useState } from 'react';

/**
 * The interactive slot picker and booking form shown when the assistant
 * returns `get_available_meeting_slots`.
 *
 * This lives in its own component rather than inside `ToolResultDataCard`'s
 * branch for that tool because it holds state. Hooks declared inside a
 * conditional branch are called in a different order on renders where the
 * branch is not taken, which is the bug `react-hooks/rules-of-hooks` reports —
 * and with four tool branches sharing one function it was a real one, not a
 * lint technicality.
 */
export type MeetingSlot = {
  date: string;
  time: string;
  available: boolean;
};

export function MeetingSlotsCard({
  slots,
  isDarkMode,
  onSelectSlot,
}: {
  slots: MeetingSlot[];
  isDarkMode: boolean;
  onSelectSlot: (slotPrompt: string) => void;
}) {
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    details: '',
  });
  const [showForm, setShowForm] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert(
        'Please provide your name and email address to confirm the booking.',
      );
      return;
    }
    const slot = slots[selectedSlotIdx] || slots[0];
    const slotStr = slot ? `on ${slot.date} at ${slot.time}` : '';
    onSelectSlot(
      `Book discovery call for ${formData.name.trim()}, email: ${formData.email.trim()}${formData.phone ? `, phone: ${formData.phone.trim()}` : ''} ${slotStr}. Scope: ${formData.details.trim() || 'General software project discussion'}`,
    );
  };

  return (
    <div
      className={`mt-2.5 rounded-xl border p-3 text-xs shadow-sm ${
        isDarkMode
          ? 'border-emerald-500/40 bg-[#04140b] text-emerald-100'
          : 'border-emerald-500/40 bg-emerald-50/80 text-emerald-950'
      }`}
    >
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
        <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          Select Discovery Meeting Slot
        </span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
          NPT (UTC+5:45)
        </span>
      </div>

      {/* Available Slot Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {slots.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedSlotIdx(idx);
              setShowForm(true);
            }}
            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] transition-all text-left font-medium ${
              selectedSlotIdx === idx && showForm
                ? 'border-emerald-500 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold shadow-sm'
                : isDarkMode
                  ? 'border-emerald-500/30 bg-[#072014] text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/30'
                  : 'border-emerald-300 bg-white text-emerald-900 hover:border-emerald-500 hover:bg-emerald-600 hover:text-white'
            }`}
          >
            <span>📅 {s.date}</span>
            <span className="font-mono">{s.time}</span>
          </button>
        ))}
      </div>

      {/* Form Toggle / Instant Form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-2.5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 text-[11px] transition-colors shadow-xs"
        >
          ✍️ Enter Your Details to Confirm Booking
        </button>
      ) : (
        <form
          onSubmit={handleFormSubmit}
          className="mt-3 pt-2.5 border-t border-emerald-500/30 space-y-2"
        >
          <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
            Confirm details for {slots[selectedSlotIdx]?.date} at{' '}
            {slots[selectedSlotIdx]?.time}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Full Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="email"
              required
              placeholder="Email Address *"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Project Scope / Notes (optional)"
              value={formData.details}
              onChange={(e) =>
                setFormData({ ...formData, details: e.target.value })
              }
              className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 text-[11px] transition-colors shadow-md flex items-center justify-center gap-1.5"
          >
            <span>🚀 Confirm & Dispatch Invitation</span>
          </button>
        </form>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrievedDocs?: string[];
  executedTools?: Array<{
    toolName: string;
    success: boolean;
    data?: unknown;
  }>;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: '📅 Available Slots', prompt: 'What meeting slots are available for a call?' },
  { label: '💼 Our Services', prompt: 'What software development services does Softmato offer?' },
  { label: '💰 Pricing & Quotes', prompt: 'How do project quotes and pricing tiers work?' },
  { label: '📞 Contact Team', prompt: 'I want to speak directly with the Softmato technical team.' },
];

/**
 * Lightweight Markdown Renderer for Chat Assistant Responses.
 */
function FormattedMarkdownText({ content, isDarkMode }: { content: string; isDarkMode: boolean }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={idx}
            className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] border ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-200/80 border-slate-300 text-slate-800'
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol
            key={key}
            className={`my-1.5 space-y-1 pl-4 list-decimal ${
              isDarkMode ? 'marker:text-slate-400' : 'marker:text-slate-600'
            }`}
          >
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul
            key={key}
            className={`my-1.5 space-y-1 pl-4 list-disc ${
              isDarkMode ? 'marker:text-slate-400' : 'marker:text-slate-600'
            }`}
          >
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list-flush-${lineIdx}`);
      return;
    }

    if (trimmed.startsWith('#')) {
      flushList(`list-heading-${lineIdx}`);
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={`h-${lineIdx}`}
          className={`mt-2 mb-1 font-semibold text-xs tracking-wide ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}
        >
          {renderInline(headingText)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const itemText = trimmed.replace(/^[•*-]\s*/, '');
      if (isNumberedList) flushList(`list-switch-${lineIdx}`);
      isNumberedList = false;
      currentList.push(
        <li key={`item-${lineIdx}`} className="leading-relaxed">
          {renderInline(itemText)}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s*/, '');
      if (!isNumberedList) flushList(`list-switch-${lineIdx}`);
      isNumberedList = true;
      currentList.push(
        <li key={`item-${lineIdx}`} className="leading-relaxed">
          {renderInline(itemText)}
        </li>
      );
      return;
    }

    flushList(`list-para-${lineIdx}`);
    elements.push(
      <p key={`p-${lineIdx}`} className="leading-relaxed my-1">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList(`list-final`);

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Rich Data Renderer for Executed Tools (Emerald color reserved strictly for important data)
 */
function ToolResultDataCard({
  toolName,
  data,
  isDarkMode,
  onSelectSlot,
}: {
  toolName: string;
  data: unknown;
  isDarkMode: boolean;
  onSelectSlot: (slotPrompt: string) => void;
}) {
  if (!data || typeof data !== 'object') return null;
  const toolData = data as Record<string, unknown>;

  // 1. Available Meeting Slots Card & Interactive Booking Form
  if (toolName === 'get_available_meeting_slots' && Array.isArray(toolData.availableSlots)) {
    const slots = toolData.availableSlots as Array<{ date: string; time: string; available: boolean }>;
    const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', details: '' });
    const [showForm, setShowForm] = useState(false);

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.email.trim()) {
        alert('Please provide your name and email address to confirm the booking.');
        return;
      }
      const slot = slots[selectedSlotIdx] || slots[0];
      const slotStr = slot ? `on ${slot.date} at ${slot.time}` : '';
      onSelectSlot(
        `Book discovery call for ${formData.name.trim()}, email: ${formData.email.trim()}${formData.phone ? `, phone: ${formData.phone.trim()}` : ''} ${slotStr}. Scope: ${formData.details.trim() || 'General software project discussion'}`
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
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">NPT (UTC+5:45)</span>
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
          <form onSubmit={handleFormSubmit} className="mt-3 pt-2.5 border-t border-emerald-500/30 space-y-2">
            <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
              Confirm details for {slots[selectedSlotIdx]?.date} at {slots[selectedSlotIdx]?.time}:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="email"
                required
                placeholder="Email Address *"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border border-emerald-400/40 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="Project Scope / Notes (optional)"
                value={formData.details}
                onChange={e => setFormData({ ...formData, details: e.target.value })}
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

  // 2. Confirmed Booking Card
  if (toolName === 'book_meeting' && toolData.bookingId) {
    return (
      <div
        className={`mt-2.5 rounded-xl border p-3.5 text-xs shadow-md ${
          isDarkMode
            ? 'border-emerald-400/40 bg-gradient-to-br from-[#062014] to-[#04160d] text-emerald-100'
            : 'border-emerald-500 bg-emerald-50 text-emerald-950'
        }`}
      >
        <div className="flex items-center justify-between font-bold border-b border-emerald-500/20 pb-1.5 mb-2">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <span className="text-emerald-500">✓</span> Meeting Confirmed
          </span>
          <span className="font-mono text-[10px] bg-emerald-600 text-white dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            {String(toolData.bookingId)}
          </span>
        </div>
        <div className="space-y-1 text-[11px] font-sans">
          <div className="flex justify-between">
            <span className="text-emerald-700 dark:text-emerald-400">Date & Time:</span>
            <span className="font-semibold">{String(toolData.date)} at {String(toolData.time)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700 dark:text-emerald-400">Client:</span>
            <span className="font-semibold">{String(toolData.client)} ({String(toolData.email)})</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Registered Lead Card
  if (toolName === 'create_lead' && toolData.leadId) {
    return (
      <div
        className={`mt-2.5 rounded-xl border p-3 text-xs shadow-sm ${
          isDarkMode
            ? 'border-emerald-500/30 bg-[#051a10] text-emerald-100'
            : 'border-emerald-500/40 bg-emerald-50 text-emerald-950'
        }`}
      >
        <div className="flex items-center justify-between font-bold border-b border-emerald-500/20 pb-1.5 mb-2">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <span>📋</span> Lead Registered
          </span>
          <span className="font-mono text-[10px] bg-emerald-600 text-white dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded">
            {String(toolData.leadId)}
          </span>
        </div>
        <div className="text-[11px] space-y-1">
          <p>Registered for <strong>{String(toolData.name)}</strong> ({String(toolData.email)})</p>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Status: Assigned to Solutions Engineer (24h SLA)</p>
        </div>
      </div>
    );
  }

  // 4. Human Handoff Card
  if (toolName === 'contact_human_team' && toolData.requestId) {
    return (
      <div
        className={`mt-2.5 rounded-xl border p-3 text-xs shadow-sm ${
          isDarkMode
            ? 'border-emerald-500/30 bg-[#051a10] text-emerald-100'
            : 'border-emerald-500/40 bg-emerald-50 text-emerald-950'
        }`}
      >
        <div className="flex items-center justify-between font-bold border-b border-emerald-500/20 pb-1.5 mb-2">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <span>📞</span> Team Support Handoff
          </span>
          <span className="font-mono text-[10px] bg-emerald-600 text-white dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded">
            {String(toolData.requestId)}
          </span>
        </div>
        <p className="text-[11px]">
          Handed off to leadership. Confirmation sent to <strong>{String(toolData.email)}</strong>.
        </p>
      </div>
    );
  }

  return null;
}

const CHAT_STORAGE_KEY = 'softmato_ai_chat_history_v1';

const DEFAULT_WELCOME_MESSAGE: ChatMessageUI = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    'Hi there! I am the **Softmato AI Consultant** 👋\n\n' +
    'We build high-performance Web Apps, Mobile Apps, and Custom SaaS platforms.\n\n' +
    'How can I help you today? Feel free to ask about our engineering services, project pricing, or schedule a quick **15-minute discovery call** with our team!',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default is Light Base Theme (White background)
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageUI[]>([DEFAULT_WELCOME_MESSAGE]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error('[ChatWidget] Failed to load history from localStorage:', err);
    }
  }, []);

  // Persist chat history to localStorage on message updates
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.error('[ChatWidget] Failed to save history to localStorage:', err);
      }
    }
  }, [messages]);

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (err) {
      console.error('[ChatWidget] Failed to clear localStorage:', err);
    }
    setMessages([
      {
        ...DEFAULT_WELCOME_MESSAGE,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessageUI = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error('Network error sending message');
      }

      const data = await res.json();
      const assistantMsg: ChatMessageUI = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        retrievedDocs: data.retrievedDocs,
        executedTools: data.executedTools,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Connection issue. Please try again or reach our technical team via the Contact form.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window Container with STRICT Fixed Dimensions & Dynamic Light/Dark Base Theme */}
      {isOpen && (
        <div
          style={{
            width: '400px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '520px',
            maxHeight: 'calc(100vh - 6rem)',
          }}
          className={`mb-3 flex flex-col overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-200 ${
            isDarkMode
              ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.9)]'
              : 'bg-white text-slate-900 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
          }`}
        >
          {/* Header */}
          <div
            className={`flex shrink-0 items-center justify-between border-b px-4 py-3 shadow-xs ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl font-bold border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-900'
                }`}
              >
                <span className="text-sm tracking-wider">S</span>
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide">Softmato AI Consultant</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online • Technical Support
                </p>
              </div>
            </div>

            {/* Actions: Clear History, Theme Toggle & Close Button */}
            <div className="flex items-center gap-1">
              {/* Clear History Button */}
              <button
                onClick={handleClearHistory}
                className={`rounded-lg p-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-rose-400'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-rose-600'
                }`}
                aria-label="Clear chat history"
                title="Reset / Clear Chat History"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`rounded-lg p-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-amber-300 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                }`}
                aria-label="Toggle theme"
                title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {isDarkMode ? (
                  /* Sun Icon */
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  /* Moon Icon */
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className={`rounded-lg p-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                }`}
                aria-label="Close chat window"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            ref={chatScrollContainerRef}
            data-lenis-prevent="true"
            data-lenis-prevent-touch="true"
            data-lenis-prevent-wheel="true"
            onWheel={e => e.stopPropagation()}
            style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
            className={`flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3 text-xs ${
              isDarkMode ? 'bg-slate-950' : 'bg-white'
            }`}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    msg.role === 'user'
                      ? isDarkMode
                        ? 'bg-slate-800 text-white border border-slate-700 rounded-br-xs shadow-xs'
                        : 'bg-slate-900 text-white rounded-br-xs shadow-sm'
                      : isDarkMode
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs shadow-xs'
                        : 'bg-slate-100 border border-slate-300 text-slate-900 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <FormattedMarkdownText content={msg.content} isDarkMode={isDarkMode} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                  )}

                  {/* Render Detailed Interactive Tool Data Cards (Emerald highlighted for important data) */}
                  {msg.executedTools &&
                    msg.executedTools.map((tool, idx) => (
                      <ToolResultDataCard
                        key={idx}
                        toolName={tool.toolName}
                        data={tool.data}
                        isDarkMode={isDarkMode}
                        onSelectSlot={slotPrompt => handleSend(slotPrompt)}
                      />
                    ))}
                </div>
                <span
                  className={`mt-1 px-1 text-[10px] font-mono font-semibold ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div
                  className={`rounded-2xl rounded-bl-xs border px-3 py-2 flex items-center gap-2 text-[11px] shadow-xs ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-300'
                      : 'border-slate-300 bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">alex is checking schedule & details...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips Bar */}
          <div
            className={`shrink-0 border-t px-3 py-2 ${
              isDarkMode
                ? 'border-slate-800 bg-slate-950'
                : 'border-slate-200 bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.prompt)}
                  disabled={loading}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition-all disabled:opacity-50 shadow-2xs ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-950'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className={`shrink-0 flex items-center gap-2 border-t px-3 py-2.5 ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900'
                : 'border-slate-200 bg-slate-100/90'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about pricing, services, or meeting..."
              disabled={loading}
              className={`flex-1 rounded-xl border px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 disabled:opacity-50 ${
                isDarkMode
                  ? 'border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:ring-slate-700'
                  : 'border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:border-slate-500 focus:ring-slate-400 shadow-inner'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold transition-all active:scale-95 disabled:opacity-40 shadow-sm ${
                isDarkMode
                  ? 'bg-slate-100 text-slate-950 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500'
                  : 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500'
              }`}
              aria-label="Send message"
            >
              <svg className="h-3.5 w-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-13 w-13 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-slate-900 active:scale-95"
        aria-label="Toggle Softmato AI Assistant"
      >
        {isOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

/**
 * In-memory record of what the assistant has captured this process lifetime.
 *
 * ## Two things to know before relying on this
 *
 * 1. **It is not persistent.** These are module-level arrays. Every cold start
 *    — every deploy, every serverless scale event — empties them. A booking
 *    confirmed here is durable only because a confirmation email was sent to
 *    the founders; the record itself is not. Moving bookings into Postgres
 *    alongside `contact_submissions` is the fix, and until that happens the
 *    admin dashboard is a live view, not a ledger.
 *
 * 2. **It starts empty, on purpose.** This module previously shipped three
 *    invented clients — names, phone numbers and project details for people
 *    who do not exist — which `/admin/leads` displayed as real business. An
 *    empty dashboard is honest; a populated fake one is not.
 */

import { generateSlots, isOfferedSlot, normaliseTime, type MeetingSlot } from './slots';

export type { MeetingSlot };

export interface BookingRecord {
  id: string;
  type: 'booking';
  bookingId: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  details?: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  type: 'lead';
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  requirements: string;
  status: 'RECEIVED' | 'IN_REVIEW' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
}

export interface SupportRecord {
  id: string;
  type: 'support';
  requestId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'HANDED_OFF' | 'RESOLVED';
  createdAt: string;
}

export type LeadEntry = BookingRecord | LeadRecord | SupportRecord;

/** Slots taken this process lifetime, keyed `YYYY-MM-DD HH:MM`. */
const takenSlots = new Set<string>();

const leadsStore: LeadEntry[] = [];

function slotKey(date: string, time: string): string {
  return `${date} ${normaliseTime(time)}`;
}

/** Offered slots, minus anything already booked. */
export function getAvailableSlots(now: Date = new Date()): MeetingSlot[] {
  return generateSlots(now).filter(s => !takenSlots.has(slotKey(s.date, s.time)));
}

/** A short, unambiguous reference. Excludes vowels so no reference reads as a word. */
function reference(prefix: string): string {
  const alphabet = '23456789BCDFGHJKLMNPQRSTVWXZ';
  let body = '';
  for (let i = 0; i < 7; i += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${body}`;
}

export type BookingFailure = 'NOT_OFFERED' | 'ALREADY_TAKEN';

export interface BookingOutcome {
  ok: boolean;
  record?: BookingRecord;
  failure?: BookingFailure;
}

/**
 * Take a slot and record the booking, or refuse.
 *
 * The refusal path is the point. Previously this called a `markSlotBooked`
 * that returned `false` for an unknown or already-taken slot — and the caller
 * discarded that boolean and reported `CONFIRMED` anyway, so the assistant
 * would happily confirm two clients into one slot, and confirm slots that were
 * never on offer. A booking that cannot be honoured must not be confirmed.
 */
export function recordBooking(data: {
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  details?: string;
  now?: Date;
}): BookingOutcome {
  const now = data.now ?? new Date();

  if (!isOfferedSlot(data.date, data.time, now)) {
    return { ok: false, failure: 'NOT_OFFERED' };
  }

  const key = slotKey(data.date, data.time);
  if (takenSlots.has(key)) {
    return { ok: false, failure: 'ALREADY_TAKEN' };
  }

  takenSlots.add(key);
  const bookingId = reference('BK');

  const record: BookingRecord = {
    id: bookingId,
    type: 'booking',
    bookingId,
    name: data.name,
    email: data.email,
    ...(data.phone ? { phone: data.phone } : {}),
    date: data.date,
    time: data.time,
    ...(data.details ? { details: data.details } : {}),
    status: 'CONFIRMED',
    createdAt: now.toISOString(),
  };

  leadsStore.unshift(record);
  return { ok: true, record };
}

export function recordLead(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  requirements: string;
}): LeadRecord {
  const leadId = reference('LD');
  const record: LeadRecord = {
    id: leadId,
    type: 'lead',
    leadId,
    name: data.name,
    email: data.email,
    ...(data.phone ? { phone: data.phone } : {}),
    ...(data.company ? { company: data.company } : {}),
    requirements: data.requirements,
    status: 'RECEIVED',
    createdAt: new Date().toISOString(),
  };
  leadsStore.unshift(record);
  return record;
}

export function recordSupportRequest(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): SupportRecord {
  const requestId = reference('SUP');
  const record: SupportRecord = {
    id: requestId,
    type: 'support',
    requestId,
    name: data.name,
    email: data.email,
    ...(data.phone ? { phone: data.phone } : {}),
    message: data.message,
    status: 'HANDED_OFF',
    createdAt: new Date().toISOString(),
  };
  leadsStore.unshift(record);
  return record;
}

export function getAllLeads(): LeadEntry[] {
  return [...leadsStore];
}

export function updateLeadStatus(id: string, status: string): boolean {
  const item = leadsStore.find(l => l.id === id);
  if (item) {
    (item as unknown as Record<string, unknown>).status = status;
    return true;
  }
  return false;
}

/** Test seam — the module-level state would otherwise leak between cases. */
export function __resetStore(): void {
  takenSlots.clear();
  leadsStore.length = 0;
}

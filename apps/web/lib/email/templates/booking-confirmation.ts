import { formatBsWithAd } from '@/lib/format/date';
import type { EmailCategory } from '../categories';
import type { EmailTemplate } from '../types';

/**
 * The meeting day, BS primary with AD in the bracket (docs/DESIGN.md §5).
 *
 * Built at midday Nepal time so the BS conversion cannot slip to the
 * neighbouring day on a server running west of UTC. A raw `2026-09-02` is
 * what the slot store holds; it is not what a confirmation should show
 * anyone, here or in the chat.
 */
function meetingDay(date: string): string {
  const parsed = new Date(`${date}T06:15:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? date : formatBsWithAd(parsed);
}

export interface BookingEmailData {
  bookingId: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  details?: string;
}

/**
 * User / Client Confirmation Email Template
 */
export function bookingClientEmail(data: BookingEmailData): EmailTemplate {
  const category: EmailCategory = 'info';
  const subject = `[Softmato] Your Discovery Meeting is Confirmed (${data.bookingId})`;

  const text = `
Hello ${data.name},

Your 15-minute Discovery & Architecture Meeting with the Softmato Technology engineering team has been confirmed!

Meeting Details:
• Booking Reference: ${data.bookingId}
• Date: ${meetingDay(data.date)}
• Time: ${data.time}
${data.details ? `• Discussion Topic: ${data.details}\n` : ''}
Our senior engineering team (Jiwan & Siddhant) looks forward to chatting about your software project.

If you need to reschedule or have any questions beforehand, simply reply to this email or contact us at contact@softmato.com.

Best regards,
Softmato Technology Team
Kathmandu, Nepal
https://softmato.com
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 28px; }
    .header { font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 16px; }
    .badge { display: inline-block; background-color: #065f46; color: #6ee7b7; font-family: monospace; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .detail-row { margin: 10px 0; font-size: 14px; color: #cbd5e1; }
    .detail-label { font-weight: 600; color: #94a3b8; }
    .footer { margin-top: 24px; border-top: 1px solid #334155; pt: 16px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">✓ Meeting Confirmed!</div>
    <p>Hi <strong>${data.name}</strong>,</p>
    <p>Your 15-minute discovery call with the <strong>Softmato Technology</strong> engineering team is officially locked in.</p>
    
    <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div class="detail-row"><span class="detail-label">Reference ID:</span> <span class="badge">${data.bookingId}</span></div>
      <div class="detail-row"><span class="detail-label">Date:</span> <strong>${meetingDay(data.date)}</strong></div>
      <div class="detail-row"><span class="detail-label">Time:</span> <strong>${data.time}</strong></div>
      ${data.phone ? `<div class="detail-row"><span class="detail-label">Contact Phone:</span> <strong>${data.phone}</strong></div>` : ''}
      ${data.details ? `<div class="detail-row"><span class="detail-label">Topic / Notes:</span> ${data.details}</div>` : ''}
    </div>

    <p style="font-size: 14px; color: #cbd5e1;">We look forward to learning more about your project goals and discussing technical options.</p>

    <div class="footer">
      Softmato Technology Pvt. Ltd. • Kathmandu, Nepal<br>
      Need to reschedule? Reply directly to this email or reach us at <a href="mailto:contact@softmato.com" style="color: #10b981;">contact@softmato.com</a>.
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, text, html, category };
}

/**
 * Platform Owner Alert Email Template
 */
export function bookingOwnerEmail(data: BookingEmailData): EmailTemplate {
  const category: EmailCategory = 'support';
  const subject = `[NEW BOOKING] ${data.name} booked a Discovery Call (${data.bookingId})`;

  const text = `
New Discovery Meeting Booked on Softmato!

Reference ID: ${data.bookingId}
Client Name: ${data.name}
Client Email: ${data.email}
Client Phone: ${data.phone || 'Not provided'}
Date: ${meetingDay(data.date)}
Time Slot: ${data.time}
Project Details: ${data.details || 'No additional details provided'}

View & manage this booking in the Admin Dashboard: https://softmato.com/admin/leads
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
    .card { background-color: #1e293b; border: 1px solid #10b981; border-radius: 12px; max-width: 580px; margin: 0 auto; padding: 28px; }
    .header { font-size: 20px; font-weight: 700; color: #10b981; margin-bottom: 16px; }
    .badge { display: inline-block; background-color: #065f46; color: #6ee7b7; font-family: monospace; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .detail-row { margin: 10px 0; font-size: 14px; color: #cbd5e1; }
    .detail-label { font-weight: 600; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">🔔 New Discovery Meeting Booked</div>
    <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <div class="detail-row"><span class="detail-label">Reference ID:</span> <span class="badge">${data.bookingId}</span></div>
      <div class="detail-row"><span class="detail-label">Client Name:</span> <strong>${data.name}</strong></div>
      <div class="detail-row"><span class="detail-label">Email:</span> <a href="mailto:${data.email}" style="color: #10b981;">${data.email}</a></div>
      <div class="detail-row"><span class="detail-label">Phone:</span> <strong>${data.phone || 'N/A'}</strong></div>
      <div class="detail-row"><span class="detail-label">Date & Time:</span> <strong>${meetingDay(data.date)} at ${data.time}</strong></div>
      <div class="detail-row"><span class="detail-label">Details / Scope:</span> ${data.details || 'None specified'}</div>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, text, html, category };
}

/**
 * The email a contact-form submission produces (docs/PRD.md §5.1).
 *
 * Pure: it renders, it does not send. Every field on it was typed by a
 * stranger, so every field goes through `escapeHtml` — see `html.ts`.
 */
import { layout, paragraph } from '../html';
import type { DetailRow } from '../html';
import type { EmailTemplate } from '../types';

export interface ContactEnquiry {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}

const DASH = '—';

/** The enquiry's own subject, or its opening words when it has none. */
export function enquiryTitle(enquiry: ContactEnquiry): string {
  if (enquiry.subject) return enquiry.subject;
  const opening = enquiry.message.trim().split('\n')[0] ?? '';
  return opening.length > 60 ? `${opening.slice(0, 57).trimEnd()}…` : opening;
}

export function contactEnquiryEmail(enquiry: ContactEnquiry): EmailTemplate {
  const title = enquiryTitle(enquiry);
  const rows: DetailRow[] = [
    { label: 'Name', value: enquiry.name },
    { label: 'Email', value: enquiry.email },
    { label: 'Phone', value: enquiry.phone ?? DASH },
    { label: 'Subject', value: enquiry.subject ?? DASH },
  ];

  const footer = `Submission #${enquiry.id} · reply to this email to answer ${enquiry.name}`;

  return {
    /*
     * `support`, not `info`: this is the one email in the product whose entire
     * purpose is to be replied to, and the reply goes to the enquirer rather
     * than to us — see `notify.ts`.
     */
    category: 'support',
    subject: `New Softmato query from ${enquiry.name}: ${title}`,
    html: layout({
      eyebrow: 'Softmato contact form',
      heading: title,
      rows,
      body: paragraph(enquiry.message),
      footer,
    }),
    text: [
      ...rows.map(({ label, value }) => `${label.padEnd(8)} ${value}`),
      '',
      enquiry.message,
      '',
      footer,
    ].join('\n'),
  };
}

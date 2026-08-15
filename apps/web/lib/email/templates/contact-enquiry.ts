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

export function contactEnquiryEmail(enquiry: ContactEnquiry): EmailTemplate {
  const rows: DetailRow[] = [
    { label: 'Name', value: enquiry.name },
    { label: 'Email', value: enquiry.email },
    { label: 'Phone', value: enquiry.phone ?? DASH },
    { label: 'Subject', value: enquiry.subject ?? DASH },
  ];

  const footer = `Submission #${enquiry.id} · reply to this email to answer ${enquiry.name}`;

  return {
    subject: enquiry.subject
      ? `Contact: ${enquiry.subject}`
      : `Contact from ${enquiry.name}`,
    html: layout({
      eyebrow: 'Contact form',
      heading: enquiry.subject ?? `New enquiry from ${enquiry.name}`,
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

/**
 * Client-portal mail: the invitation, a new message, and work ready for
 * review. Pure — they render, they do not send (`lib/portal/notify.ts` does).
 *
 * Every field a person typed goes through `escapeHtml`/`paragraph`, and each
 * email carries its link as plain text too, for clients who read mail as text.
 */
import { escapeHtml, layout, paragraph } from '../html';
import type { EmailTemplate } from '../types';

function button(url: string, label: string): string {
  return `<p style="margin:24px 0 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 18px;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

export function portalInvitationEmail(input: {
  name: string;
  clientName: string;
  url: string;
  expiresIn: string;
  reset: boolean;
}): EmailTemplate {
  const first = input.name.split(/\s+/)[0] ?? input.name;
  const lead = input.reset
    ? `Hi ${first}, here is a link to set a new password for the ${input.clientName} client portal. Your current password keeps working until you use it.`
    : `Hi ${first}, you have been invited to the ${input.clientName} client portal at Softmato. It is where you can follow your project's progress, approve work, share files with the team and see your invoices.`;
  const note = `The link works once and expires ${input.expiresIn}. If you did not expect this email, you can ignore it.`;

  return {
    category: 'security',
    subject: input.reset
      ? 'Set a new password for the Softmato client portal'
      : `Your ${input.clientName} client portal at Softmato`,
    html: layout({
      eyebrow: 'Client portal',
      heading: input.reset ? 'Choose a new password' : 'You are invited',
      body: `${paragraph(lead)}${button(input.url, input.reset ? 'Set a new password' : 'Choose your password')}<p style="margin:20px 0 0 0;font-size:13px;color:#55665d;">${paragraph(note)}</p>`,
      footer: 'Softmato Technology · client portal',
    }),
    text: [lead, '', input.url, '', note].join('\n'),
  };
}

export function portalMessageEmail(input: {
  /** Who is being told: the client, or Softmato. */
  to: 'client' | 'company';
  authorName: string;
  clientName: string;
  projectName: string;
  body: string;
  url: string;
}): EmailTemplate {
  const heading =
    input.to === 'client'
      ? `${input.authorName} at Softmato wrote on ${input.projectName}`
      : `${input.authorName} (${input.clientName}) wrote on ${input.projectName}`;
  const cta =
    input.to === 'client' ? 'Reply in the portal' : 'Open the project';
  const excerpt =
    input.body.length > 1200 ? `${input.body.slice(0, 1200)}…` : input.body;

  return {
    category: 'info',
    subject:
      input.to === 'client'
        ? `New message on ${input.projectName}`
        : `${input.clientName}: new message on ${input.projectName}`,
    html: layout({
      eyebrow: input.to === 'client' ? 'Client portal' : 'Client message',
      heading,
      body: `${paragraph(excerpt)}${button(input.url, cta)}`,
      footer:
        input.to === 'client'
          ? 'Replies to this email are not added to the project — answer in the portal so the whole team sees it.'
          : 'Sent by the client portal.',
    }),
    text: [heading, '', excerpt, '', `${cta}: ${input.url}`].join('\n'),
  };
}

export function portalReviewEmail(input: {
  projectName: string;
  title: string;
  url: string;
}): EmailTemplate {
  const lead = `“${input.title}” on ${input.projectName} is ready for you to look at. Approve it, or send it back with a note on what should change.`;

  return {
    category: 'info',
    subject: `Ready for your review: ${input.title}`,
    html: layout({
      eyebrow: 'Client portal',
      heading: 'Ready for your review',
      body: `${paragraph(lead)}${button(input.url, 'Review it')}`,
      footer: 'Softmato Technology · client portal',
    }),
    text: [lead, '', input.url].join('\n'),
  };
}

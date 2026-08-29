import 'server-only';

import type { EmailCategory } from './categories';
import { emailConfigured, resendClient } from './client';
import { fromHeaderFor, replyToFor } from './identity';
import { resolveEmailIdentity } from './resolve-identity';
import type { EmailTemplate } from './types';

/**
 * The single outbound path for email (docs/EMAIL_SYSTEM.md).
 *
 * The `From` header is assembled per send from the configured identity and the
 * message's category, so billing mail leaves as `Softmato Billing
 * <billing@softmato.com>` and an alert as `Softmato Alerts <alert@…>` without
 * any call site knowing how an address is put together.
 *
 * **Never throws.** Whatever prompted the email — an enquiry, an invoice, a
 * dunning reminder — is already recorded by the time this runs, and a provider
 * having a bad minute must not roll that back. Callers receive the reason so
 * they can log it; the visitor is told the message arrived, because it did.
 *
 * Anything that must not be lost belongs in the database first and here
 * second, never here alone.
 */
export interface SendResult {
  sent: boolean;
  reason?: string;
}

export const NOT_CONFIGURED = 'email not configured';

/** A file to send alongside the message — an invoice PDF, a statement. */
export interface EmailAttachment {
  /** Shown to the recipient. Include the extension. */
  filename: string;
  content: Buffer;
}

export interface Message {
  to: string | string[];
  template: EmailTemplate;
  /**
   * Where a human reply should land, when that is not the configured address.
   *
   * Ordinary mail leaves this alone: `replyToFor` derives an address on the
   * sending domain. Set it only when the right recipient is a third party —
   * a contact enquiry forwarded to us should reply to the enquirer, not to us.
   */
  replyTo?: string | undefined;
  /**
   * Overrides the template's category. For ad-hoc mail with no template behind
   * it; a template already carries the right answer.
   */
  category?: EmailCategory;
  attachments?: EmailAttachment[];
}

export async function sendEmail({
  to,
  template,
  replyTo,
  category,
  attachments,
}: Message): Promise<SendResult> {
  if (!emailConfigured) {
    return { sent: false, reason: NOT_CONFIGURED };
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, reason: 'no recipient' };
  }

  const kind = category ?? template.category;
  const identity = await resolveEmailIdentity();
  const from = fromHeaderFor(kind, identity);

  // No domain at all is how a deployment expresses "email is off". It is not
  // an error worth throwing over; it is the same no-op as a missing key.
  if (!from) {
    return { sent: false, reason: NOT_CONFIGURED };
  }

  const replyAddress = replyTo ?? replyToFor(kind, identity);

  try {
    const { error } = await resendClient().emails.send({
      from,
      to: recipients,
      subject: template.subject,
      html: template.html,
      text: template.text,
      ...(replyAddress ? { replyTo: replyAddress } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });

    if (error) return { sent: false, reason: error.message };

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'unknown',
    };
  }
}

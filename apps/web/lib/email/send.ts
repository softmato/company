import 'server-only';

import { env } from '@/lib/env';

import { emailConfigured, resendClient } from './client';
import type { EmailTemplate } from './types';

/**
 * The single outbound path for email.
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

export interface Message {
  to: string | string[];
  template: EmailTemplate;
  /** Where a human reply should land, when that is not the sender. */
  replyTo?: string | undefined;
}

export async function sendEmail({
  to,
  template,
  replyTo,
}: Message): Promise<SendResult> {
  if (!emailConfigured || !env.EMAIL_FROM) {
    return { sent: false, reason: NOT_CONFIGURED };
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, reason: 'no recipient' };
  }

  try {
    const { error } = await resendClient().emails.send({
      from: env.EMAIL_FROM,
      to: recipients,
      subject: template.subject,
      html: template.html,
      text: template.text,
      ...(replyTo ? { replyTo } : {}),
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

import 'server-only';
import { Resend } from 'resend';

import { env } from '@/lib/env';

/**
 * The Resend client (docs/ENVIRONMENT.md §2).
 *
 * Email is optional as a group, exactly like R2: with no key set, sending is
 * unavailable and every caller degrades rather than throwing. Nothing in this
 * product may lose data because an email provider is unconfigured — the
 * contact form writes to the database first and mails second for that reason.
 */

/**
 * True when a send can actually reach a mailbox.
 *
 * The key is the only hard requirement. The domain has a shipped default
 * (`softmato.com`, the one Resend verifies), so an unset `EMAIL_DOMAIN` is a
 * deployment accepting that default rather than a deployment with email off.
 */
export const emailConfigured = Boolean(env.RESEND_API_KEY);

let client: Resend | null = null;

export function resendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error('Resend is not configured');
  }

  client ??= new Resend(env.RESEND_API_KEY);

  return client;
}

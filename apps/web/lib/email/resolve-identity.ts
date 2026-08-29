import 'server-only';

import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings/queries';

import { DEFAULT_MAILBOXES } from './categories';
import {
  SHIPPED_EMAIL_DOMAIN,
  SHIPPED_SENDER_NAME,
  type EmailIdentity,
} from './identity';

/**
 * The live sender identity: environment for the domain, settings for the rest
 * (docs/EMAIL_SYSTEM.md §3).
 *
 * Every field except the domain is the founder's to change from the admin
 * panel without a deploy, and every one of them may be left blank — blank
 * means "use the shipped default", so an empty settings table still sends
 * correctly branded mail from the right mailboxes.
 */

/**
 * The domain reads env first and settings second, the reverse of every other
 * field here.
 *
 * It is not a branding choice: it has to match what Resend verified for this
 * deployment, and a settings form is exactly where that gets mistyped. A typo
 * in the display name is a cosmetic bug; a typo here silently stops all email.
 */
function configuredDomain(): string {
  return env.EMAIL_DOMAIN?.trim() ?? '';
}

/**
 * What to send as when nothing has been configured — a script, a test, or a
 * database that is not answering.
 */
export function fallbackIdentity(): EmailIdentity {
  return {
    domain: configuredDomain() || SHIPPED_EMAIL_DOMAIN,
    mailboxes: { ...DEFAULT_MAILBOXES },
    replyTo: env.EMAIL_REPLY_TO?.trim() ?? '',
    senderName: SHIPPED_SENDER_NAME,
  };
}

/**
 * Reads the identity for one send.
 *
 * **Never throws.** A settings table that is unreachable must not stop an
 * alert going out, so a failed read degrades to the shipped identity rather
 * than taking the email down with it.
 *
 * No cache of its own: `getSettings()` is memoised per request, so a page that
 * sends three emails makes one query. A loop outside a request — a cron run
 * billing every subscriber — pays one read per message, which is the right
 * trade while sends are counted in tens. Revisit it, with a TTL, on the day a
 * broadcast is counted in thousands.
 */
export async function resolveEmailIdentity(): Promise<EmailIdentity> {
  const fallback = fallbackIdentity();

  try {
    const settings = await getSettings();

    return {
      domain: configuredDomain() || SHIPPED_EMAIL_DOMAIN,
      mailboxes: {
        alert: settings.text('email.mailbox_alert') || DEFAULT_MAILBOXES.alert,
        billing:
          settings.text('email.mailbox_billing') || DEFAULT_MAILBOXES.billing,
        info: settings.text('email.mailbox_info') || DEFAULT_MAILBOXES.info,
        noreply:
          settings.text('email.mailbox_noreply') || DEFAULT_MAILBOXES.noreply,
        security:
          settings.text('email.mailbox_security') || DEFAULT_MAILBOXES.security,
        support:
          settings.text('email.mailbox_support') || DEFAULT_MAILBOXES.support,
      },
      /*
       * Only what was set for email. `company.support_email` is deliberately
       * not consulted — see `replyToFor` in `identity.ts` for why a contact
       * detail must not become a routing address.
       */
      replyTo: settings.text('email.reply_to') || fallback.replyTo,
      senderName: settings.text('email.sender_name') || fallback.senderName,
    };
  } catch {
    return fallback;
  }
}

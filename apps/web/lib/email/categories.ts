/**
 * What kind of mail this is — and therefore which mailbox it leaves from
 * (docs/EMAIL_SYSTEM.md §1).
 *
 * Softmato verifies `softmato.com` as a whole in Resend, so any local-part on
 * it can send without its own verification. That makes the local-part free to
 * carry meaning: a customer who sees `alert@` in their inbox knows before
 * opening it that this one is not a receipt.
 *
 * The split is by **what the message is**, not by which module sent it — a
 * gateway going down is an `alert` although it comes out of payments, and a
 * password reset is `security` although auth also sends ordinary `info` mail.
 *
 * Pure: no `server-only`, no database, no environment. The header assembly in
 * `identity.ts` is unit tested directly against these tables.
 */
export type EmailCategory =
  /** Ordinary product mail: notices, approvals, confirmations. */
  | 'info'
  /** Needs attention now: a failed payout, a gateway that is down. */
  | 'alert'
  /** Money: invoices, receipts, reminders, refunds. */
  | 'billing'
  /** Credentials and account safety: OTPs, resets, new logins. */
  | 'security'
  /** Mail a person is expected to reply to: enquiries, support threads. */
  | 'support'
  /** Machine mail with nothing to say back to. */
  | 'noreply';

export const EMAIL_CATEGORIES: readonly EmailCategory[] = [
  'info',
  'alert',
  'billing',
  'security',
  'support',
  'noreply',
];

/**
 * What a message is when nothing says otherwise.
 *
 * `info` rather than `noreply`: a category is a promise to the recipient, and
 * the safe default is the one that still accepts a reply.
 */
export const DEFAULT_EMAIL_CATEGORY: EmailCategory = 'info';

/**
 * Shipped local-parts, overridable per deployment — which mailboxes exist is
 * the founder's decision, not ours (`email.mailbox_*` in the settings table).
 */
export const DEFAULT_MAILBOXES: Record<EmailCategory, string> = {
  alert: 'alert',
  billing: 'billing',
  info: 'info',
  noreply: 'noreply',
  security: 'security',
  support: 'support',
};

/**
 * A suffix on the display name, so the sender reads as the department it is
 * rather than as one undifferentiated robot.
 *
 * `info` and `noreply` get none — they are the company speaking as itself.
 */
export const NAME_SUFFIX: Record<EmailCategory, string> = {
  alert: 'Alerts',
  billing: 'Billing',
  info: '',
  noreply: '',
  security: 'Security',
  support: 'Support',
};

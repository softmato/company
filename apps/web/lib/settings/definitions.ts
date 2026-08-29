/**
 * Every setting the platform reads, with its type, default and help text.
 *
 * **This file is the authority.** The database holds overrides; a key with no
 * row uses the default below. That is what lets the app boot against an empty
 * table, and what stops a stray row inventing a setting nothing reads.
 *
 * Adding one: add it here, read it through `getSettings()`, and never read
 * `process.env` for something a founder should be able to change at 11pm
 * without a deploy.
 *
 * Not settings, and never to be moved here: account codes, posting rules,
 * period boundaries, provider credentials. A value that can change from a form
 * must not be able to move posted money or authenticate anything.
 */
export type SettingKind =
  'integer' | 'decimal' | 'boolean' | 'text' | 'email' | 'phone' | 'url';

export interface SettingDefinition {
  key: string;
  group: string;
  label: string;
  help: string;
  kind: SettingKind;
  default: string;
  /** Inclusive bounds for numeric kinds. */
  min?: number;
  max?: number;
  /** Shown after the input — 'days', 'NPR', '%'. */
  unit?: string;
}

export const SETTING_GROUPS = [
  'Billing',
  'Support',
  'Website',
  'Company',
  'Email',
] as const;

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  /* ── Billing ────────────────────────────────────────────── */
  {
    key: 'billing.invoice_due_days',
    group: 'Billing',
    label: 'Invoice due in',
    help: 'Days from issue until an invoice is due. Stated in the Terms of Service — change both together.',
    kind: 'integer',
    default: '15',
    min: 0,
    max: 180,
    unit: 'days',
  },
  {
    key: 'billing.grace_days',
    group: 'Billing',
    label: 'Grace period',
    help: 'Days a subscription keeps working after its renewal invoice falls due, before suspension.',
    kind: 'integer',
    default: '7',
    min: 0,
    max: 90,
    unit: 'days',
  },
  {
    key: 'billing.suspended_retention_days',
    group: 'Billing',
    label: 'Keep data after suspension',
    help: 'Days a suspended account keeps its data so a late payment restores it intact.',
    kind: 'integer',
    default: '90',
    min: 7,
    max: 730,
    unit: 'days',
  },
  {
    key: 'billing.refund_window_days',
    group: 'Billing',
    label: 'Refund window',
    help: 'Days after a first subscription payment in which a full refund is given for any reason.',
    kind: 'integer',
    default: '7',
    min: 0,
    max: 90,
    unit: 'days',
  },
  {
    key: 'billing.refund_decision_working_days',
    group: 'Billing',
    label: 'Refund decision within',
    help: 'Working days to decide a refund request. Promised in the Refund Policy.',
    kind: 'integer',
    default: '7',
    min: 1,
    max: 30,
    unit: 'working days',
  },
  {
    key: 'billing.vat_registered',
    group: 'Billing',
    label: 'VAT registered',
    help: 'Off today: Softmato is PAN-registered only. Turn this on the day registration completes — it decides whether invoices carry VAT, and the Terms of Service say the same thing.',
    kind: 'boolean',
    default: 'false',
  },
  {
    key: 'billing.vat_rate_percent',
    group: 'Billing',
    label: 'VAT rate',
    help: 'Rate applied once VAT registration is on. Nepal is 13% at the time of writing.',
    kind: 'decimal',
    default: '13',
    min: 0,
    max: 100,
    unit: '%',
  },

  /* ── Support ────────────────────────────────────────────── */
  {
    key: 'support.uptime_target_percent',
    group: 'Support',
    label: 'Uptime target',
    help: 'Monthly availability promised in the SLA. Missing it costs service credits.',
    kind: 'decimal',
    default: '99.5',
    min: 90,
    max: 100,
    unit: '%',
  },
  {
    key: 'support.p1_response_minutes',
    group: 'Support',
    label: 'P1 response target',
    help: 'Minutes to first response for a critical issue, at any hour of any day.',
    kind: 'integer',
    default: '60',
    min: 5,
    max: 1440,
    unit: 'minutes',
  },
  {
    key: 'support.p2_response_hours',
    group: 'Support',
    label: 'P2 response target',
    help: 'Hours to first response for a major issue with no workaround.',
    kind: 'integer',
    default: '4',
    min: 1,
    max: 72,
    unit: 'hours',
  },

  /* ── Website ────────────────────────────────────────────── */
  {
    key: 'website.contact_rate_limit_per_hour',
    group: 'Website',
    label: 'Contact form limit',
    help: 'Submissions allowed from one visitor per hour before the form starts refusing.',
    kind: 'integer',
    default: '5',
    min: 1,
    max: 100,
    unit: 'per hour',
  },

  /* ── Company ────────────────────────────────────────────── */
  {
    key: 'company.support_email',
    group: 'Company',
    label: 'Support email',
    help: 'Where customers report problems. Printed in the SLA.',
    kind: 'email',
    default: '',
  },
  {
    key: 'company.refunds_email',
    group: 'Company',
    label: 'Refunds email',
    help: 'Where refund requests go. Printed in the Refund Policy.',
    kind: 'email',
    default: '',
  },
  {
    key: 'company.abuse_email',
    group: 'Company',
    label: 'Abuse and security email',
    help: 'Where abuse reports and vulnerability disclosures go. Printed in the Acceptable Use Policy.',
    kind: 'email',
    default: '',
  },
  {
    key: 'company.phone',
    group: 'Company',
    label: 'Phone',
    help: 'Shown on the contact page and on invoices.',
    kind: 'phone',
    default: '',
  },
  {
    key: 'company.address',
    group: 'Company',
    label: 'Registered address',
    help: 'As registered with the Office of the Company Registrar. Appears on invoices and in the policies.',
    kind: 'text',
    default: '',
  },
  {
    key: 'company.pan',
    group: 'Company',
    label: 'PAN',
    help: 'Permanent Account Number. Required on every tax invoice.',
    kind: 'text',
    default: '',
  },

  /*
   * Social profiles, for `sameAs` in the site's structured data.
   *
   * These are the only way to tell a search engine that softmato.com and a
   * LinkedIn page are the same organisation rather than two that share a name.
   * All blank by default: a `sameAs` pointing at a profile we do not control
   * is worse than no `sameAs` at all, so nothing is guessed from the company
   * name here — the founder pastes the real URLs or the array stays empty.
   */
  {
    key: 'company.linkedin_url',
    group: 'Company',
    label: 'LinkedIn page',
    help: 'Full URL of the company LinkedIn page. Used in structured data so search engines link the profile to this site.',
    kind: 'url',
    default: '',
  },
  {
    key: 'company.github_url',
    group: 'Company',
    label: 'GitHub organisation',
    help: 'Full URL of the company GitHub organisation, if it is public.',
    kind: 'url',
    default: '',
  },
  {
    key: 'company.x_url',
    group: 'Company',
    label: 'X profile',
    help: 'Full URL of the company profile on X. Leave blank if there is none.',
    kind: 'url',
    default: '',
  },
  {
    key: 'company.facebook_url',
    group: 'Company',
    label: 'Facebook page',
    help: 'Full URL of the company Facebook page. Worth setting in Nepal, where it is often the first place a client looks.',
    kind: 'url',
    default: '',
  },

  /* ── Email ──────────────────────────────────────────────── */
  /*
   * How outgoing mail signs itself. The sending domain is deliberately absent:
   * it must match what Resend verified, so it lives in `EMAIL_DOMAIN` where a
   * typo is a deploy rather than a form submission (docs/EMAIL_SYSTEM.md §3).
   *
   * Every key here ships blank and blank means "use the default", so an empty
   * settings table still sends correctly branded mail from the right mailboxes.
   */
  {
    key: 'email.sender_name',
    group: 'Email',
    label: 'Sender name',
    help: 'The name recipients see, before the per-category suffix — "Softmato" becomes "Softmato Billing" on an invoice. Blank uses Softmato.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.reply_to',
    group: 'Email',
    label: 'Reply-to address',
    help: 'Where replies land. Leave blank: info@ on the sending domain is derived, and that is an address we are certain we own. Anything typed here must be a mailbox that actually receives — a wrong one sends every reply into a bounce and reports nothing.',
    kind: 'email',
    default: '',
  },
  {
    key: 'email.mailbox_info',
    group: 'Email',
    label: 'Info mailbox',
    help: 'Local-part for ordinary mail — notices, confirmations. Also the mailbox replies are derived from, so this is the one to create a forwarding alias for first. Blank uses info.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.mailbox_alert',
    group: 'Email',
    label: 'Alert mailbox',
    help: 'Local-part for mail that needs attention now — a failed payout, a gateway that is down. Blank uses alert.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.mailbox_billing',
    group: 'Email',
    label: 'Billing mailbox',
    help: 'Local-part for money — invoices, receipts, reminders, refunds. Blank uses billing.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.mailbox_security',
    group: 'Email',
    label: 'Security mailbox',
    help: 'Local-part for credentials and account safety — codes, resets, new logins. Blank uses security.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.mailbox_support',
    group: 'Email',
    label: 'Support mailbox',
    help: 'Local-part for mail a person is expected to reply to — enquiries, support threads. Blank uses support.',
    kind: 'text',
    default: '',
  },
  {
    key: 'email.mailbox_noreply',
    group: 'Email',
    label: 'No-reply mailbox',
    help: 'Local-part for machine mail with nothing to say back to. Mail from here carries no reply address at all. Blank uses noreply.',
    kind: 'text',
    default: '',
  },
];

export const SETTING_KEYS = SETTING_DEFINITIONS.map((d) => d.key);

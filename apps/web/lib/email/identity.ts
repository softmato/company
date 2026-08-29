/**
 * Assembling the `From` and `Reply-To` headers (docs/EMAIL_SYSTEM.md §2).
 *
 * Pure — no `server-only`, no database, no environment — so both rules below
 * are unit tested directly. `resolve-identity.ts` is the half that reads the
 * world; this is the half that decides what the envelope says.
 */
import {
  DEFAULT_MAILBOXES,
  NAME_SUFFIX,
  type EmailCategory,
} from './categories';

/** The shared Softmato sending domain, used when nothing configures one. */
export const SHIPPED_EMAIL_DOMAIN = 'softmato.com';

/** Display name of last resort. The legal name is too long for a header. */
export const SHIPPED_SENDER_NAME = 'Softmato';

export interface EmailIdentity {
  /**
   * Domain the mail is sent from. **Must be verified in Resend** — an
   * unverified domain is not a degraded send, it is a rejected one.
   */
  domain: string;
  /** Local-part per category: `{ billing: 'billing' }` → `billing@domain`. */
  mailboxes: Record<EmailCategory, string>;
  /**
   * Explicit reply address. Empty means "derive one" — see `replyToFor`.
   *
   * Whatever goes here must be a mailbox that actually receives. A reply is
   * the one part of an email we cannot test by sending: Resend reports success
   * either way, and the failure surfaces days later as a bounce in someone
   * else's inbox.
   */
  replyTo: string;
  /** Display name, before the per-category suffix. */
  senderName: string;
}

/**
 * `{ category, identity }` → a `From` header.
 *
 * Returns null only when there is no domain at all, which is how a deployment
 * with email switched off is expressed — `sendEmail` reports it and no-ops
 * rather than throwing.
 */
export function fromHeaderFor(
  category: EmailCategory,
  identity: EmailIdentity,
): string | null {
  const domain = normaliseDomain(identity.domain);
  if (!domain) return null;

  const mailbox = (
    identity.mailboxes[category] ||
    DEFAULT_MAILBOXES[category] ||
    DEFAULT_MAILBOXES.info
  ).trim();

  /*
   * Sanitise BEFORE falling back, not after. A name of `"<>` is not a name: it
   * survives a truthiness check, then sanitises down to nothing, and the mail
   * goes out as a bare address with no branding at all.
   *
   * The characters are stripped rather than escaped because they would break
   * the header and no legitimate sender name needs them — and because this
   * field is editable from the admin panel: without this, whoever can edit
   * settings could append `<attacker@evil.test>` and rewrite the envelope of
   * every email the company sends.
   */
  const cleaned = identity.senderName.replace(/["\\,;<>]/g, '').trim();
  const name = [cleaned || SHIPPED_SENDER_NAME, NAME_SUFFIX[category]]
    .filter(Boolean)
    .join(' ');

  return `${name} <${mailbox}@${domain}>`;
}

/**
 * Where a reply to this message should land.
 *
 * Derived from the **sending domain** when nothing is configured, rather than
 * borrowed from `company.support_email`. Those are different things that
 * happen to look alike: the support address is a contact detail printed in the
 * SLA and the footer, chosen for humans to read, and it ships blank. Reaching
 * for it here would mean the default configuration sends every reply nowhere.
 *
 * The derived address sits on a domain we already send from, so it cannot
 * point somewhere unowned. It uses the `info` mailbox because that is the one
 * a deployment is most likely to have set up to *receive*: sending needs only
 * the domain verified, receiving needs a forwarding alias per address, and
 * `info@` is the conventional first one.
 *
 * `noreply` gets none. That is the entire meaning of the category, and a
 * `Reply-To` on it would be the product contradicting its own address.
 */
export function replyToFor(
  category: EmailCategory,
  identity: EmailIdentity,
): string {
  if (category === 'noreply') return '';

  const configured = identity.replyTo.trim();
  if (configured) return configured;

  const domain = normaliseDomain(identity.domain);
  if (!domain) return '';

  const mailbox = (identity.mailboxes.info || DEFAULT_MAILBOXES.info).trim();

  return `${mailbox}@${domain}`;
}

/** Tolerates `@softmato.com`, which is how the domain gets typed in a form. */
function normaliseDomain(domain: string): string {
  return domain.trim().replace(/^@/, '');
}

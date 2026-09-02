/**
 * The registered-domain rule: where an application is allowed to send a
 * customer, and where we are willing to deliver its webhooks.
 *
 * ## Why this exists
 *
 * `return_url` used to accept any https host. A stolen client secret was
 * therefore enough to land a paying customer on a lookalike "payment failed,
 * try again" page and take a second payment — off a checkout page carrying
 * Softmato's name. `webhook_url` is worse, because our own server fetches it:
 * an internal address there turns the platform into the attacker's errand boy.
 *
 * The fix for both is the same idea. **The allowed addresses are written down
 * by an admin, signed in, in advance.** Never sent by the caller, never
 * inferred from the request. A secret answers "who is this"; this answers "and
 * where may they send my customer".
 *
 * ## Why it is one function
 *
 * Two consumers need this check — `POST /v1/checkout` for `return_url`, and
 * every path that writes `webhook_url`. Written out twice it is two chances
 * for one of them to use `endsWith`, which is the bug this file exists to
 * prevent: `'evilquestioncall.com'.endsWith('questioncall.com')` is `true`.
 * Matching here is exact equality on the normalised hostname, and there is no
 * other way to ask.
 */
import { and, eq } from 'drizzle-orm';

import { applicationDomains, db, type DbLike } from '@softmato/db';

import { PaymentError } from '../errors';

/**
 * The bare hostname a URL will be matched by, or null if the URL is not one
 * we will ever accept.
 *
 * `new URL()` does the punycode conversion for us, so an IDN homograph is
 * folded to its ASCII form before it is compared — `xn--` against `xn--`,
 * never a Cyrillic `а` against a Latin `a`. The trailing dot of a fully
 * qualified name is stripped because `questioncall.com.` and
 * `questioncall.com` resolve to the same host and must not be two rows.
 */
export function normalizeHostname(value: string): string | null {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;

  // `url.hostname` is already lowercase and punycode; it drops the port.
  const host = url.hostname.replace(/\.$/, '');

  // The same shape the CHECK constraint enforces: dot-separated LDH labels.
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
      host,
    )
  ) {
    return null;
  }

  /*
   * No all-numeric final label — which is to say, no IP address.
   *
   * This is the rule that stops `https://169.254.169.254/latest/meta-data/`,
   * and it has to be its own check: `169.254.169.254` is four perfectly legal
   * LDH labels and sails through the shape test above. `new URL()` canonicalises
   * every IPv4 encoding — `2130706433`, `0x7f000001`, `017700000001`, `127.1`
   * — to dotted decimal first, so catching the canonical form catches all of
   * them. IPv6 is already gone: `[::1]` carries brackets and colons.
   *
   * No real TLD is entirely numeric, so nothing legitimate is refused here.
   */
  if (/\.[0-9]+$/.test(host)) return null;

  if (host.length < 4 || host.length > 253) return null;

  return host;
}

/**
 * Normalises an admin-supplied hostname for storage.
 *
 * Admins type `questioncall.com`, not `https://questioncall.com`, so a bare
 * host is accepted here and run through the same normaliser by borrowing a
 * scheme. Anything carrying a scheme, port or path is refused rather than
 * silently trimmed: quietly turning `https://evil.com/path` into `evil.com`
 * would hide that the admin pasted the wrong thing.
 */
export function normalizeHostnameInput(value: string): string | null {
  const raw = value.trim();
  if (raw === '') return null;
  if (/[/:*\s]/.test(raw)) return null;

  return normalizeHostname(`https://${raw.toLowerCase()}`);
}

/**
 * Throws unless `url` is https and its hostname is registered against this
 * application.
 *
 * The message names the field and the hostname that was refused, because a
 * caller must be able to fix this without opening a support thread. It does
 * not list the registered hostnames — that would turn a stolen secret into a
 * map of everywhere the product lives.
 *
 * The https requirement lives here rather than in a zod schema in a route
 * file, so there is one place that decides what an acceptable destination is.
 */
export async function assertRegisteredHost(
  applicationId: number,
  url: string,
  field: string,
  conn: DbLike = db,
): Promise<string> {
  const hostname = normalizeHostname(url);

  if (hostname === null) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `${field} must be an absolute https:// URL with a valid hostname`,
      { field },
      `${field} must be an absolute https:// URL naming a hostname. Addresses without a public domain name — an IP address, "localhost" — are never accepted.`,
    );
  }

  const [match] = await conn
    .select({ id: applicationDomains.id })
    .from(applicationDomains)
    .where(
      and(
        eq(applicationDomains.applicationId, applicationId),
        // Exact equality. Never `like`, never `endsWith`.
        eq(applicationDomains.hostname, hostname),
      ),
    )
    .limit(1);

  if (!match) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      `${field} points at "${hostname}", which is not a registered domain for this application`,
      { field, hostname },
      /*
       * Names the host, because a caller must be able to fix this without
       * opening a support thread. It does not list the registered hostnames:
       * that would turn a stolen secret into a map of everywhere the product
       * lives.
       */
      `${field} points at "${hostname}", which is not a registered domain for this application. An administrator must add it at admin.softmato.com before it can be used.`,
    );
  }

  return hostname;
}

/**
 * Whether a URL is still allowed, without throwing.
 *
 * For the render path: the callback page re-checks a stored `return_url` every
 * time it draws the link, so a domain removed after a session was created
 * stops being linkable. A page cannot usefully throw over that — it just does
 * not draw the button.
 */
export async function isRegisteredHost(
  applicationId: number,
  url: string | null,
  conn: DbLike = db,
): Promise<boolean> {
  if (!url) return false;

  try {
    await assertRegisteredHost(applicationId, url, 'return_url', conn);
    return true;
  } catch {
    return false;
  }
}

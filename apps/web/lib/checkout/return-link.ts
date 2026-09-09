import 'server-only';

import { eq } from 'drizzle-orm';

import { applications, db, paymentSessions } from '@softmato/db';
import { isRegisteredHost } from '@softmato/payment-core';

/**
 * The second hop: handing the customer back to the product they came from.
 *
 * Hop one already exists and is not touched — the customer lands on our own
 * callback page, which ignores every provider query parameter and asks the
 * provider directly. This is only the way back out.
 *
 * ## Three things this deliberately does not do
 *
 * **It does not redirect.** The callback page renders five outcomes and three
 * of them are not "paid": pending, under review, and not completed. Forwarding
 * automatically would rush someone past *"This payment is being reviewed,
 * please do not pay again"* — which is the one sentence on that page that
 * stops a customer paying twice. It returns a link for them to click.
 *
 * **It puts no payment status in the URL.** The product learns what happened
 * from the webhook, never from a parameter we hand the customer. That is the
 * invariant the callback page exists to protect, and it has to survive this
 * change: a `?status=paid` here would recreate, on the way out, exactly the
 * forgeable signal the page refuses to read on the way in.
 *
 * **It re-checks the host, now, not when the session was made.** A domain
 * removed after a session was created must stop being linkable — otherwise
 * revoking a compromised domain would leave every session created before the
 * revocation still pointing at it.
 */
export interface ReturnLink {
  /** The registered URL, exactly as stored. No parameters are appended. */
  href: string;
  /** The application's name, for *"Return to QuestionCall"*. */
  applicationName: string;
}

export async function returnLinkFor(
  sessionId: string,
): Promise<ReturnLink | null> {
  const [row] = await db
    .select({
      returnUrl: paymentSessions.returnUrl,
      credentialId: paymentSessions.credentialId,
      applicationName: applications.name,
    })
    .from(paymentSessions)
    .innerJoin(applications, eq(applications.id, paymentSessions.applicationId))
    .where(eq(paymentSessions.id, sessionId))
    .limit(1);

  /*
   * No return URL is the ordinary case, not an error: the page then renders
   * exactly as it did before this existed.
   *
   * A null `credentialId` means a session opened from the admin panel. There
   * is no credential, so there is no allowlist to check against and no
   * integration to hand the customer back to — the same answer, reached
   * honestly rather than by checking a list that does not apply.
   */
  if (!row?.returnUrl || row.credentialId === null) return null;

  /*
   * The **credential's** allowlist. This read `applicationId` for the same
   * reason `POST /v1/checkout` did — both were written when domains hung off
   * the application — and `isRegisteredHost` filters
   * `application_domains.credential_id`. Passing the wrong id here fails
   * closed rather than open, because it swallows the refusal and simply does
   * not draw the button, which is why it went unnoticed: the link was just
   * missing sometimes.
   */
  const allowed = await isRegisteredHost(row.credentialId, row.returnUrl);

  if (!allowed) return null;

  return { href: row.returnUrl, applicationName: row.applicationName };
}

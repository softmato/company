import 'server-only';

import { eq } from 'drizzle-orm';
import { adminUsers, db } from '@softmato/db';

import { env } from '@/lib/env';
import { sendEmail, NOT_CONFIGURED } from '@/lib/email/send';
import type { SendResult } from '@/lib/email/send';
import { contactEnquiryEmail } from '@/lib/email/templates/contact-enquiry';
import type { ContactEnquiry } from '@/lib/email/templates/contact-enquiry';

/**
 * Emails a contact enquiry to every active platform admin, plus
 * `COMPANY_EMAIL` when it is set — so an enquiry reaches the people who can
 * answer it without anyone having to remember to fill in a setting.
 *
 * The submission is saved before this runs and `sendEmail` never throws, so a
 * provider outage costs a notification, never an enquiry — it is still in
 * /admin/enquiries. No-ops when there is nobody to send to.
 */
export type ContactNotification = ContactEnquiry;

export async function notifyContact(
  submission: ContactNotification,
): Promise<SendResult> {
  const admins = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.isActive, true));

  const to = [
    ...new Set(
      [...admins.map((a) => a.email), env.COMPANY_EMAIL].filter(
        (email): email is string => Boolean(email),
      ),
    ),
  ];

  if (to.length === 0) {
    return { sent: false, reason: NOT_CONFIGURED };
  }

  return sendEmail({
    to,
    template: contactEnquiryEmail(submission),
    // So a reply goes to the enquirer rather than to the company itself.
    replyTo: submission.email,
  });
}

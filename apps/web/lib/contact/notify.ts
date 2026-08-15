import 'server-only';

import { env } from '@/lib/env';
import { sendEmail, NOT_CONFIGURED } from '@/lib/email/send';
import type { SendResult } from '@/lib/email/send';
import { contactEnquiryEmail } from '@/lib/email/templates/contact-enquiry';
import type { ContactEnquiry } from '@/lib/email/templates/contact-enquiry';

/**
 * Emails a contact enquiry to the company.
 *
 * The submission is saved before this runs and `sendEmail` never throws, so a
 * provider outage costs a notification, never an enquiry. No-ops when email is
 * unconfigured, which is the case locally and in CI.
 */
export type ContactNotification = ContactEnquiry;

export async function notifyContact(
  submission: ContactNotification,
): Promise<SendResult> {
  if (!env.COMPANY_EMAIL) {
    return { sent: false, reason: NOT_CONFIGURED };
  }

  return sendEmail({
    to: env.COMPANY_EMAIL,
    template: contactEnquiryEmail(submission),
    // So a reply goes to the enquirer rather than to the company itself.
    replyTo: submission.email,
  });
}

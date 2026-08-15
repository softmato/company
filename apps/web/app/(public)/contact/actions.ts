'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { contactSubmissions, db } from '@softmato/db';

import { notifyContact } from '@/lib/contact/notify';
import { hashIp, isRateLimited } from '@/lib/contact/rate-limit';
import { NOT_CONFIGURED } from '@/lib/email/send';

export interface ContactResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z.object({
  name: z.string().trim().min(1, 'Please give us a name to reply to'),
  email: z.string().trim().email('That does not look like an email address'),
  phone: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  subject: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  message: z.string().trim().min(10, 'A little more detail, please'),
});

/**
 * The honeypot field. Hidden from people, irresistible to naive bots.
 *
 * A filled honeypot returns the same success message a real submission gets:
 * telling a bot it was detected only teaches whoever wrote it to stop filling
 * the field.
 */
const HONEYPOT = 'website';

export async function submitContact(
  _previous: ContactResult | undefined,
  form: FormData,
): Promise<ContactResult> {
  if (String(form.get(HONEYPOT) ?? '') !== '') {
    return { ok: true, message: 'Thanks — we will be in touch.' };
  }

  const parsed = schema.safeParse({
    name: String(form.get('name') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? ''),
    subject: String(form.get('subject') ?? ''),
    message: String(form.get('message') ?? ''),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: 'Nothing was sent.', fieldErrors };
  }

  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? null;
  const ipHash = ip ? hashIp(ip) : null;

  if (ipHash && (await isRateLimited(ipHash))) {
    return {
      ok: false,
      message:
        'That is a few messages in a short time. Please try again a little later.',
    };
  }

  const [saved] = await db
    .insert(contactSubmissions)
    .values({
      ...parsed.data,
      ipHash,
      userAgent: headerList.get('user-agent'),
    })
    .returning();

  if (!saved) {
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }

  /*
   * Stored first, emailed second, and a failed email does not fail the
   * submission — the enquiry is already safe in the database, which is the
   * whole reason it is stored as well as sent (docs/PRD.md §5.1).
   */
  const notified = await notifyContact(saved);
  if (!notified.sent && notified.reason !== NOT_CONFIGURED) {
    console.error('contact email failed', {
      id: saved.id,
      reason: notified.reason,
    });
  }

  return { ok: true, message: 'Thanks — we will be in touch.' };
}

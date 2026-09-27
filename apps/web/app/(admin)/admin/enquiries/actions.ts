'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { contactSubmissions, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { parseId, requireAdmin } from '@/lib/admin/require-admin';

/** Marks an enquiry handled, or reopens it (`handled=0`). */
export async function setEnquiryHandledAction(form: FormData): Promise<void> {
  const adminId = Number(await requireAdmin());
  const id = parseId(form.get('id'));
  const handled = form.get('handled') === '1';

  await db
    .update(contactSubmissions)
    .set(
      handled
        ? { handledAt: new Date(), handledBy: adminId }
        : { handledAt: null, handledBy: null },
    )
    .where(eq(contactSubmissions.id, id));

  await recordAudit({
    actorType: 'admin',
    actorId: String(adminId),
    action: handled ? 'enquiry.handled' : 'enquiry.reopened',
    resourceType: 'contact_submission',
    resourceId: String(id),
  });

  revalidatePath('/admin/enquiries');
}

/** Moves an enquiry into spam (`spam=1`), or restores it as a real one. */
export async function setEnquirySpamAction(form: FormData): Promise<void> {
  const adminId = Number(await requireAdmin());
  const id = parseId(form.get('id'));
  const spam = form.get('spam') === '1';

  await db
    .update(contactSubmissions)
    .set({ spamReason: spam ? 'marked as spam by an admin' : null })
    .where(eq(contactSubmissions.id, id));

  await recordAudit({
    actorType: 'admin',
    actorId: String(adminId),
    action: spam ? 'enquiry.marked_spam' : 'enquiry.not_spam',
    resourceType: 'contact_submission',
    resourceId: String(id),
  });

  revalidatePath('/admin/enquiries');
}

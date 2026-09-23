'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { db } from '@softmato/db';
import { isPaymentError, recordPaidRefund } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email/send';
import { refundIssuedEmail } from '@/lib/email/templates/refund-issued';

import { requireAdmin } from '../cms/actions/shared';
import { reauthenticate } from '../security/reauth';

/** "12", "12.5", "12.50" rupees → paisa. Anything else is null. */
function rupeesToPaisa(raw: string): bigint | null {
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(raw.trim());
  if (!match) return null;
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

/**
 * Books a refund the admin already paid in the provider's merchant app, then
 * emails the customer. Books money on the admin's word, so it asks for the
 * password and an authenticator code — the same bar as confirming cash.
 */
export async function recordRefundAction(form: FormData): Promise<void> {
  const adminId = Number(await requireAdmin());
  const refundNo = String(form.get('refundNo') ?? '');
  const reference = String(form.get('reference') ?? '');
  const note = String(form.get('message') ?? '').slice(0, 1000);
  const amountMinor = rupeesToPaisa(String(form.get('amount') ?? ''));

  const me = await reauthenticate(
    adminId,
    String(form.get('password') ?? ''),
    String(form.get('code') ?? ''),
  );

  let message: string;

  if (!me.ok) {
    await recordAudit({
      actorType: 'admin',
      actorId: String(adminId),
      action: 'refund.reauth_failed',
      resourceType: 'refund',
      resourceId: refundNo,
    });
    message = 'Password or authenticator code was wrong. Nothing changed.';
  } else if (amountMinor === null) {
    message = 'Enter the amount in rupees, like 12 or 12.50. Nothing changed.';
  } else {
    try {
      const now = new Date();
      const paid = await db.transaction((tx) =>
        recordPaidRefund(
          tx,
          { refundNo, amountMinor, providerRefundId: reference, adminId },
          recordAudit,
          now,
        ),
      );

      if (paid.customerEmail) {
        const to = paid.customerEmail;
        // After the response: a slow mail provider must not hold the page, and
        // a failed send must not undo a refund that is already booked.
        after(async () => {
          const sent = await sendEmail({
            to,
            template: refundIssuedEmail(paid, note, now),
          });
          if (!sent.sent) {
            console.error(
              `[refund] ${paid.refundNo}: email not sent — ${sent.reason ?? 'unknown'}`,
            );
          }
        });
      }

      message = paid.customerEmail
        ? `${paid.refundNo} recorded as paid (${paid.journalNo}). The customer is being emailed.`
        : `${paid.refundNo} recorded as paid (${paid.journalNo}). The customer has no email address, so nothing was sent.`;
    } catch (error) {
      if (!isPaymentError(error)) console.error(`[refund] ${refundNo}:`, error);
      message = isPaymentError(error)
        ? (error.publicDetail ?? error.publicMessage)
        : 'Could not save that. Nothing changed.';
    }
  }

  revalidatePath('/admin/refunds');
  redirect(`/admin/refunds?message=${encodeURIComponent(message)}`);
}

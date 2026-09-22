'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@softmato/db';
import {
  confirmOfflinePayment,
  isPaymentError,
  rejectOfflinePayment,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { sendPaymentReceipt } from '@/lib/payments/send-receipt';

import { requireAdmin } from '../cms/actions/shared';
import { reauthenticate } from '../security/reauth';

/**
 * The second person on a cash payment. Books money on the admin's word, so it
 * asks for the password and an authenticator code every time, on top of the
 * MFA session — the same bar as revoking a live credential.
 */
async function decide(form: FormData, run: (txnNo: string, adminId: number) => Promise<string>) {
  const adminId = Number(await requireAdmin());
  const txnNo = String(form.get('txnNo') ?? '');
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
      action: 'transaction.cash_reauth_failed',
      resourceType: 'transaction',
      resourceId: txnNo,
    });
    message = 'Password or authenticator code was wrong. Nothing changed.';
  } else {
    try {
      message = await run(txnNo, adminId);
    } catch (error) {
      message = isPaymentError(error)
        ? (error.publicDetail ?? error.publicMessage)
        : 'Could not save that. Nothing changed.';
    }
  }

  revalidatePath('/admin/cash');
  redirect(`/admin/cash?message=${encodeURIComponent(message)}`);
}

export async function confirmCashAction(form: FormData): Promise<void> {
  await decide(form, async (txnNo, adminId) => {
    const outcome = await db.transaction((tx) =>
      confirmOfflinePayment(tx, txnNo, adminId, recordAudit, sendPaymentReceipt),
    );

    return outcome.state === 'settled'
      ? `${txnNo} confirmed. It is booked to Cash in Hand and the receipt is on its way.`
      : `${txnNo} was not booked: ${'reason' in outcome ? outcome.reason : outcome.state}.`;
  });
}

export async function rejectCashAction(form: FormData): Promise<void> {
  const reason = String(form.get('reason') ?? '').trim();

  await decide(form, async (txnNo, adminId) => {
    if (!reason) return 'Say why it is rejected — the integrator is told.';

    await db.transaction((tx) => rejectOfflinePayment(tx, txnNo, adminId, reason.slice(0, 300), recordAudit));

    return `${txnNo} rejected. Nothing was booked.`;
  });
}

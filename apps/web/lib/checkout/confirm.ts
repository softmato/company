/**
 * The app's side of confirming a payment: find the attempt, ask the provider,
 * apply the answer.
 *
 * Thin on purpose — `confirmTransaction` in `payment-core` holds the rules.
 * This binds it to the app's audit recorder and receipt sender, which the
 * package cannot import (docs/FOLDER_STRUCTURE.md).
 */
import 'server-only';

import { db } from '@softmato/db';
import {
  confirmTransaction,
  latestAttempt,
  loadSession,
  isPaymentError,
  type SettlementOutcome,
} from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { ensureProvidersRegistered } from '@/lib/payments/providers';
import { sendPaymentReceipt } from '@/lib/payments/send-receipt';

export type ConfirmOutcome =
  | SettlementOutcome
  /** No such session, or nobody ever started a payment against it. */
  | { state: 'no-attempt' };

export async function confirmSessionPayment(
  sessionId: string,
): Promise<ConfirmOutcome> {
  ensureProvidersRegistered();

  try {
    const session = await loadSession(db, sessionId);
    const attempt = await latestAttempt(db, session.id);

    /*
     * A customer can reach the callback URL without ever having started a
     * payment — by typing it, or by returning to a stale tab after the attempt
     * was swept. There is nothing to confirm and nothing to report as failed.
     */
    if (!attempt) return { state: 'no-attempt' };

    return await confirmTransaction(
      attempt,
      recordAudit,
      sendPaymentReceipt,
      'callback',
    );
  } catch (error) {
    if (isPaymentError(error) && error.code === 'RESOURCE_NOT_FOUND') {
      return { state: 'no-attempt' };
    }

    throw error;
  }
}

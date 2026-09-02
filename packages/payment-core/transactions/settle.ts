/**
 * A verified provider result → whatever should happen because of it.
 *
 * This is the join that was missing. `completePayment` existed and was good;
 * the adapters existed; nothing in between decided *which* of them a given
 * result called for, so every route that received a provider answer either
 * threw it away or would have had to re-derive the dispatch itself. Callback,
 * poll job and admin retry all funnel through here so the rules live once.
 *
 * The rules:
 *
 *   * `succeeded` → `completePayment`, which posts the journal, clears the
 *     invoice and sends the receipt. Idempotent: a repeat returns the existing
 *     journal and posts nothing (PHASES.md Phase 4 acceptance 3).
 *   * `pending` → nothing at all. Not a status write, not an audit entry —
 *     "still going" is the absence of news, and writing it on every poll would
 *     bury the audit log.
 *   * `failed` / `cancelled` / `expired` → a status move, and only from a
 *     transaction that had not already settled.
 *   * `refunded` → **never applied automatically.** See below.
 *   * An amount mismatch → `completePayment` flags it and throws; that is
 *     caught here and reported, because a mismatch is an outcome to display,
 *     not a crash.
 */
import { eq } from 'drizzle-orm';

import { invoices, type DbTx, type Transaction } from '@softmato/db';

import type { AuditRecorder } from '../audit';
import { isPaymentError } from '../errors';
import { enqueueWebhook } from '../webhooks/enqueue';
import { eventForStatus } from '../webhooks/events';
import type { VerifiedResult } from '../providers/types';
import type { Receipt, ReceiptSender } from '../receipts/receipt';
import { completePayment } from './complete';
import { isSettled, isTerminal, type TxnStatus } from './state-machine';
import { transitionTransaction } from './transition';

export type SettlementOutcome =
  | {
      state: 'settled';
      transaction: Transaction;
      journalNo: string;
      receipt: Receipt | null;
      /** True when this result arrived after the payment was already booked. */
      replayed: boolean;
    }
  | { state: 'pending'; transaction: Transaction }
  | { state: 'closed'; transaction: Transaction; status: TxnStatus }
  /** The provider and our records disagree. A human decides; nothing posted. */
  | { state: 'reconciliation'; transaction: Transaction; reason: string };

export async function settleTransaction(
  tx: DbTx,
  transaction: Transaction,
  verified: VerifiedResult,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  now = new Date(),
): Promise<SettlementOutcome> {
  const status = transaction.status as TxnStatus;

  // Already flagged. Only a person moves it, so a later poll must not.
  if (status === 'reconciliation_required') {
    return {
      state: 'reconciliation',
      transaction,
      reason: 'This payment is already held for review.',
    };
  }

  switch (verified.status) {
    case 'succeeded':
      return settle(tx, transaction, verified, audit, sendReceipt, now);

    case 'pending':
      return { state: 'pending', transaction };

    case 'failed':
    case 'cancelled':
    case 'expired':
      return close(tx, transaction, verified, audit, now);

    /*
     * A provider reporting a refund is not authority to book one.
     *
     * Reversing entries are Phase 6/7 work and do not exist yet, so applying
     * this would move the transaction to `refunded` while the ledger still
     * shows the money as ours — the books would disagree with the provider and
     * nothing would say so. Flagging is the honest response, and it is also
     * the correct one long-term: a refund we did not initiate is exactly the
     * kind of thing a person should see (RULES.md §2.8).
     */
    case 'refunded':
      return flag(
        tx,
        transaction,
        audit,
        'The provider reports this payment as refunded.',
        verified,
        now,
      );
  }
}

async function settle(
  tx: DbTx,
  transaction: Transaction,
  verified: VerifiedResult,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  now: Date,
): Promise<SettlementOutcome> {
  try {
    const completed = await completePayment(
      tx,
      transaction,
      verified,
      audit,
      sendReceipt,
      now,
    );

    /*
     * Only on the attempt that actually posted. A replayed result must not
     * re-notify: a SaaS receiving `payment.success` twice for one transaction
     * would, if it provisions on the event, provision twice.
     */
    if (completed.posted) {
      await notify(tx, completed.transaction, now);
    }

    return {
      state: 'settled',
      transaction: completed.transaction,
      journalNo: completed.journalNo,
      receipt: completed.receipt,
      replayed: !completed.posted,
    };
  } catch (error) {
    /*
     * `completePayment` has already written the flag and the audit entry, on
     * the pool rather than on `tx` precisely so they survive this throw. There
     * is nothing to write here — only something to report.
     */
    if (isPaymentError(error) && error.code === 'AMOUNT_MISMATCH') {
      return {
        state: 'reconciliation',
        transaction,
        reason:
          'The amount the provider reported does not match this invoice. It is held for review.',
      };
    }

    throw error;
  }
}

async function close(
  tx: DbTx,
  transaction: Transaction,
  verified: VerifiedResult,
  audit: AuditRecorder,
  now: Date,
): Promise<SettlementOutcome> {
  const status = transaction.status as TxnStatus;

  /*
   * A settled payment cannot be talked out of being settled.
   *
   * This is a real sequence, not a hypothetical: a customer pays, the callback
   * settles it, and a poll already in flight returns the pre-payment state. If
   * that reply were applied, a booked payment with a journal entry behind it
   * would move to `failed` and the ledger would be left crediting revenue for
   * a failed transaction.
   */
  if (isSettled(status)) {
    return {
      state: 'reconciliation',
      transaction,
      reason: `The provider reports ${verified.status} for a payment already settled.`,
    };
  }

  /*
   * Already closed, and closed is forever.
   *
   * `failed`, `cancelled` and `expired` are terminal, so attempting the move a
   * second time is an `ILLEGAL_TRANSITION` — which `confirmTransaction`
   * catches and reports as `pending`, on the reasonable assumption that a
   * rejected transition means somebody else won a race. Here it means nothing
   * of the sort, and the customer was told so: cancel a payment, reload the
   * callback, and the page said "your payment is still being confirmed… we
   * will email a receipt as soon as it does". A receipt that is never coming,
   * for a payment they deliberately stopped.
   *
   * Reporting what the row already says is both honest and idempotent, and it
   * costs nothing — a reload, a second callback and a poll still in flight all
   * land here.
   */
  if (isTerminal(status)) {
    return { state: 'closed', transaction, status };
  }

  const next = verified.status as Extract<
    TxnStatus,
    'failed' | 'cancelled' | 'expired'
  >;

  const moved = await transitionTransaction(
    tx,
    transaction,
    next,
    { failureReason: `Provider reported ${verified.status}` },
    now,
  );

  await audit(
    {
      actorType: 'system',
      actorId: 'settlement',
      action: `payment.${next}`,
      resourceType: 'transaction',
      resourceId: moved.txnNo,
      beforeState: { status },
      afterState: { status: next },
    },
    tx,
  );

  await notify(tx, moved, now);

  return { state: 'closed', transaction: moved, status: next };
}

/**
 * Queue the outbound event for whichever SaaS is waiting on this payment.
 *
 * Written on `tx`, so the notification commits with the settlement it
 * describes — a queued event for a payment that rolled back would be a lie
 * sent on a retry. Delivery itself happens later, in `retry-webhooks`.
 *
 * A status with no corresponding event (`reconciliation_required`) is silent
 * on purpose; see `webhooks/events.ts`.
 */
async function notify(
  tx: DbTx,
  transaction: Transaction,
  now: Date,
): Promise<void> {
  const event = eventForStatus(transaction.status);

  if (!event) return;

  const [invoice] = await tx
    .select({ invoiceNo: invoices.invoiceNo })
    .from(invoices)
    .where(eq(invoices.id, transaction.invoiceId))
    .limit(1);

  if (!invoice) return;

  await enqueueWebhook(tx, transaction, event, invoice.invoiceNo, now);
}

async function flag(
  tx: DbTx,
  transaction: Transaction,
  audit: AuditRecorder,
  reason: string,
  verified: VerifiedResult,
  now: Date,
): Promise<SettlementOutcome> {
  const moved = await transitionTransaction(
    tx,
    transaction,
    'reconciliation_required',
    { failureReason: reason },
    now,
  );

  await audit(
    {
      actorType: 'system',
      actorId: 'settlement',
      action: 'payment.flagged',
      resourceType: 'transaction',
      resourceId: moved.txnNo,
      beforeState: { status: transaction.status },
      afterState: { reason, providerStatus: verified.status },
    },
    tx,
  );

  return { state: 'reconciliation', transaction: moved, reason };
}

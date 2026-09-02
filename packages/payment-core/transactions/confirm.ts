/**
 * Asking the provider what happened, then acting on the answer.
 *
 * The whole confirmation path in one call, and the shape every entry point
 * uses: the customer returning from a gateway, the polling job, an admin
 * retrying a stuck payment.
 *
 * **The network call happens outside the database transaction.** A gateway
 * lookup takes as long as it takes, and holding a Postgres transaction open
 * across it would put a remote timeout in the way of every other write —
 * including the settlement of a different payment. So: poll, record the event,
 * then open a transaction and apply the result.
 *
 * **Nothing a browser sends is consulted.** The provider reference comes from
 * our own `transactions` row and the answer comes from the provider's API over
 * our own authenticated connection. That is PHASES.md Phase 4 acceptance 2 —
 * "hitting the return URL with a forged `status=Completed` marks nothing paid"
 * — and it holds by construction rather than by remembering to ignore the
 * query string, because there is nowhere here to pass one in.
 */
import { db, type Transaction } from '@softmato/db';

import type { AuditRecorder } from '../audit';
import { isPaymentError, PaymentError } from '../errors';
import { eventIdFor, recordProviderEvent, type ProviderEventType } from '../providers/events';
import { providerAdapter } from '../providers/registry';
import { isProviderId } from '../providers/types';
import type { ReceiptSender } from '../receipts/receipt';
import { settleTransaction, type SettlementOutcome } from './settle';

export async function confirmTransaction(
  transaction: Transaction,
  audit: AuditRecorder,
  sendReceipt: ReceiptSender,
  eventType: ProviderEventType = 'poll',
  now = new Date(),
): Promise<SettlementOutcome> {
  if (!isProviderId(transaction.providerId)) {
    throw new PaymentError('VALIDATION_FAILED', 'Unknown provider on transaction', {
      txnNo: transaction.txnNo,
      providerId: transaction.providerId,
    });
  }

  const adapter = providerAdapter(transaction.providerId);
  const verified = await adapter.poll(transaction);

  /*
   * Recorded before it is acted on, and never rolled back with the settlement
   * — a result that fails to apply is the one most worth having on file.
   */
  await recordProviderEvent(
    {
      providerId: transaction.providerId,
      eventType,
      providerEventId: eventIdFor(transaction.providerRef ?? transaction.txnNo, verified),
      // The lookup travelled over our own authenticated connection to the
      // provider, so the channel is the assurance; no payload signature was
      // presented to check.
      signatureValid: true,
      payload: verified.raw,
      transactionId: transaction.id,
    },
    now,
  );

  try {
    return await db.transaction((tx) =>
      settleTransaction(tx, transaction, verified, audit, sendReceipt, now),
    );
  } catch (error) {
    /*
     * Two pollers, or a poller and a returning customer, landing together. The
     * loser's compare-and-set fails, which is the guarantee working — so this
     * is reported as a fact about the row rather than raised as an error, and
     * the caller re-reads to see what the winner decided.
     */
    if (isPaymentError(error) && error.code === 'ILLEGAL_TRANSITION') {
      await recordProviderEvent(
        {
          providerId: transaction.providerId,
          eventType,
          providerEventId: `${transaction.txnNo}:concurrent:${now.toISOString()}`,
          signatureValid: true,
          payload: verified.raw,
          transactionId: transaction.id,
          processingError: error.message,
        },
        now,
      );

      return { state: 'pending', transaction };
    }

    throw error;
  }
}

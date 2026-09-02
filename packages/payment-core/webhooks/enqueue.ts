/**
 * Queueing an event for a SaaS, rather than sending it.
 *
 * **Nothing is delivered inline.** The row is written inside the same
 * transaction that settled the payment, and the HTTP request happens later, in
 * a job. Two reasons, and the second is the one that bites:
 *
 *   1. A consumer's server being slow would hold a database transaction open
 *      across their timeout, on the money path.
 *   2. A consumer's server being *down* would, on an inline send, either fail
 *      the settlement — unwinding a posted journal because someone else's
 *      endpoint was unreachable — or be swallowed, in which case the event is
 *      lost with nothing recording that it should have been sent.
 *
 * Writing a row commits the intent atomically with the payment: if the
 * settlement rolls back there is no event, and if it commits the event is
 * queued and will be retried until it lands or is abandoned.
 *
 * The signature stored here is for the *first* attempt only. Every retry
 * re-signs with a fresh timestamp, because §4 also tells consumers to reject
 * timestamps older than five minutes — a signature minted at enqueue would be
 * stale by the second retry and correctly rejected by a compliant consumer for
 * a delivery that was perfectly genuine. The column holds the last signature
 * sent, which is what an admin replaying a delivery needs to see.
 */
import { eq } from 'drizzle-orm';

import {
  applications,
  webhookDeliveries,
  type DbLike,
  type Transaction,
} from '@softmato/db';

import { buildPayload, type WebhookEvent } from './events';
import { sign } from './signature';

export interface EnqueueResult {
  /** False when the application has no webhook configured — not an error. */
  queued: boolean;
}

export async function enqueueWebhook(
  tx: DbLike,
  transaction: Transaction,
  event: WebhookEvent,
  invoiceNo: string,
  occurredAt = new Date(),
): Promise<EnqueueResult> {
  /*
   * A session created through the admin panel rather than the API has no
   * application behind it, and there is nobody to notify. Normal, not a fault.
   */
  if (transaction.applicationId === null) return { queued: false };

  const [application] = await tx
    .select({
      webhookUrl: applications.webhookUrl,
      webhookSecret: applications.webhookSecret,
    })
    .from(applications)
    .where(eq(applications.id, transaction.applicationId))
    .limit(1);

  // Webhooks are opt-in. Both are needed: a URL with no secret would have to
  // be sent unsigned, and an unsigned payment notification is not something to
  // send at all.
  if (!application?.webhookUrl || !application.webhookSecret) {
    return { queued: false };
  }

  const payload = buildPayload(event, transaction, invoiceNo, occurredAt);

  // The payload is stored rather than rebuilt at delivery, so the bytes a
  // consumer verifies are the bytes that were signed — `deliver.ts` uses the
  // same `JSON.stringify(payload)` with no whitespace options.
  const timestamp = Math.floor(occurredAt.getTime() / 1000);

  await tx.insert(webhookDeliveries).values({
    applicationId: transaction.applicationId,
    eventType: event,
    payload,
    signature: sign(application.webhookSecret, timestamp, JSON.stringify(payload)),
    status: 'pending',
    // Due immediately; the retry job picks it up on its next pass.
    nextAttemptAt: occurredAt,
  });

  return { queued: true };
}

/**
 * `retry-webhooks` — actually sending the queued events.
 *
 * Runs every minute (docs/ARCHITECTURE.md §6). Despite the name it delivers
 * first attempts too: `enqueue` writes a row due immediately and this is what
 * picks it up, so there is one delivery path rather than an inline one plus a
 * retry one that drift apart.
 *
 * **Every attempt is signed afresh.** docs/API.md §4 tells consumers to reject
 * timestamps older than five minutes, so re-sending a signature minted at
 * enqueue would fail verification on the second retry onwards — for a delivery
 * that was entirely genuine. The body is byte-identical each time; only the
 * timestamp and therefore the signature change.
 *
 * **Eight failures, then `abandoned`.** Not deleted and not retried forever: a
 * consumer whose endpoint has been down for hours is not helped by a ninth
 * attempt, and the row is what the admin replay acts on.
 */
import { and, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import {
  applications,
  webhookDeliveries,
  type DbLike,
} from '@softmato/db';

import { sign } from './signature';

/** docs/API.md §4. */
export const MAX_ATTEMPTS = 8;

/** How long a consumer gets to answer before the attempt counts as failed. */
const TIMEOUT_MS = 10_000;

export interface RetryWebhooksResult {
  attempted: number;
  delivered: number;
  failed: number;
  abandoned: number;
}

/**
 * 1m, 2m, 4m … capped at an hour. Same shape as the provider poll backoff and
 * for the same reason: quick while the failure is likely transient, slow once
 * it plainly is not.
 */
function nextAttemptAt(attempts: number, now: Date): Date {
  const delay = Math.min(60_000 * 2 ** Math.min(attempts, 16), 60 * 60_000);

  return new Date(now.getTime() + delay);
}

export async function retryWebhooks(
  db: DbLike,
  now = new Date(),
  /** Same reasoning as `pollPendingTransactions`: each row is an HTTP call
   * with a 10s timeout of its own, and an over-running job gets disabled by
   * the cron runner. See `jobs/poll-pending.ts`. */
  limit = 25,
): Promise<RetryWebhooksResult> {
  const due = await db
    .select({
      id: webhookDeliveries.id,
      applicationId: webhookDeliveries.applicationId,
      eventType: webhookDeliveries.eventType,
      payload: webhookDeliveries.payload,
      attempts: webhookDeliveries.attempts,
      url: applications.webhookUrl,
      secret: applications.webhookSecret,
    })
    .from(webhookDeliveries)
    .innerJoin(
      applications,
      eq(applications.id, webhookDeliveries.applicationId),
    )
    .where(
      and(
        inArray(webhookDeliveries.status, ['pending', 'failed']),
        or(
          isNull(webhookDeliveries.nextAttemptAt),
          lte(webhookDeliveries.nextAttemptAt, now),
        ),
      ),
    )
    .limit(limit);

  const result: RetryWebhooksResult = {
    attempted: 0,
    delivered: 0,
    failed: 0,
    abandoned: 0,
  };

  for (const delivery of due) {
    // Reconfigured to no URL or no secret since it was queued. Nothing to send
    // to, and no way to sign it — abandoned rather than retried forever.
    if (!delivery.url || !delivery.secret) {
      await db
        .update(webhookDeliveries)
        .set({
          status: 'abandoned',
          lastError: 'Application has no webhook URL or secret',
          nextAttemptAt: null,
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      result.abandoned += 1;
      continue;
    }

    result.attempted += 1;

    const attempts = delivery.attempts + 1;
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(now.getTime() / 1000);
    const signature = sign(delivery.secret, timestamp, body);

    const outcome = await attempt(delivery.url, body, signature, timestamp);

    if (outcome.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          status: 'delivered',
          attempts,
          signature,
          lastStatusCode: outcome.status,
          deliveredAt: now,
          nextAttemptAt: null,
          lastError: null,
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      result.delivered += 1;
      continue;
    }

    const exhausted = attempts >= MAX_ATTEMPTS;

    await db
      .update(webhookDeliveries)
      .set({
        status: exhausted ? 'abandoned' : 'failed',
        attempts,
        signature,
        lastStatusCode: outcome.status ?? null,
        lastError: outcome.error.slice(0, 500),
        nextAttemptAt: exhausted ? null : nextAttemptAt(attempts, now),
      })
      .where(eq(webhookDeliveries.id, delivery.id));

    if (exhausted) result.abandoned += 1;
    else result.failed += 1;
  }

  return result;
}

type Attempt =
  | { ok: true; status: number }
  | { ok: false; status?: number; error: string };

/**
 * One HTTP POST, with a timeout and no thrown exception.
 *
 * A consumer that accepts a connection and never answers would otherwise hang
 * this job indefinitely, and with it every delivery queued behind it.
 */
async function attempt(
  url: string,
  body: string,
  signature: string,
  timestamp: number,
): Promise<Attempt> {
  const abort = AbortSignal.timeout(TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Softmato-Signature': signature,
        'X-Softmato-Timestamp': String(timestamp),
      },
      body,
      signal: abort,
    });

    if (response.ok) return { ok: true, status: response.status };

    return {
      ok: false,
      status: response.status,
      error: `Consumer responded ${response.status}`,
    };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

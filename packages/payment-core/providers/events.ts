/**
 * Every answer a provider gives us, written down verbatim.
 *
 * `provider_events` existed in the schema and nothing had ever inserted a row.
 * It is required by PHASES.md Phase 4 ("`provider_events` recording for every
 * lookup") and it is what makes a disputed payment answerable months later:
 * the payload is stored untouched, so the question "what did eSewa actually
 * say?" has an answer that is not a reconstruction.
 *
 * **Deduplication is the table's own.** `provider_events_dedup_key` is unique
 * on `(provider_id, provider_event_id, event_type)`, so the same event arriving
 * twice is one row — and the insert here is `onConflictDoNothing`, which turns
 * that guarantee into a no-op rather than an error. Five identical lookups
 * leave one row, which is the same property `completePayment` guarantees for
 * the journal, enforced one layer down.
 *
 * **It is written outside the settlement transaction, on purpose.** A result
 * that fails to settle — an amount mismatch, an illegal transition — is
 * precisely the one worth having a record of, and a row written on `tx` would
 * be rolled back by the failure it documents. Same reasoning as
 * `flagForReconciliation` in `transactions/complete.ts`.
 */
import { db, providerEvents } from '@softmato/db';

import type { ProviderId, VerifiedResult } from './types';

export type ProviderEventType = 'callback' | 'poll' | 'settlement';

export interface ProviderEventInput {
  providerId: ProviderId;
  eventType: ProviderEventType;
  /**
   * The provider's own identifier for this event. Khalti has no event id, so
   * `pidx` plus the status it reported serves — two lookups that say the same
   * thing are the same event, and one that says something new is not.
   */
  providerEventId: string;
  /**
   * False only when a signature was checked and failed. A provider that signs
   * nothing (a Khalti lookup over an authenticated channel) records `true`,
   * because the channel is the assurance.
   */
  signatureValid: boolean;
  payload: unknown;
  transactionId?: number | null;
  processingError?: string | null;
}

export async function recordProviderEvent(
  input: ProviderEventInput,
  now = new Date(),
): Promise<void> {
  await db
    .insert(providerEvents)
    .values({
      providerId: input.providerId,
      providerEventId: input.providerEventId.slice(0, 200),
      eventType: input.eventType,
      signatureValid: input.signatureValid,
      payload: asJson(input.payload),
      transactionId: input.transactionId ?? null,
      processedAt: now,
      processingError: input.processingError ?? null,
    })
    .onConflictDoNothing();
}

/** An event id for a result that carries no id of its own. */
export function eventIdFor(
  providerRef: string,
  verified: VerifiedResult,
): string {
  return verified.providerTxnId
    ? `${providerRef}:${verified.providerTxnId}:${verified.status}`
    : `${providerRef}:${verified.status}`;
}

/**
 * `payload` is `jsonb` and non-null, and what arrives here is whatever a
 * gateway sent — which is not guaranteed to be an object, or to survive
 * `JSON.stringify` if it contains a `bigint`. Anything that is not a plain
 * object is wrapped rather than dropped: the point of the column is that
 * nothing is lost.
 */
function asJson(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return JSON.parse(
      JSON.stringify(payload, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as Record<string, unknown>;
  }

  return { value: payload === undefined ? null : String(payload) };
}

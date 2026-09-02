/**
 * `retry-webhooks` — every minute (docs/ARCHITECTURE.md §6).
 *
 * Delivers first attempts as well as retries: `enqueueWebhook` writes a row
 * due immediately and this is what sends it. One delivery path, so an inline
 * sender and a retry sender cannot drift apart.
 */
import { db } from '@softmato/db';
import { retryWebhooks } from '@softmato/payment-core';

import { jobEndpoint } from '@/lib/jobs/endpoint';

export const dynamic = 'force-dynamic';

/** Each attempt has a 10s timeout and they run in sequence. */
export const maxDuration = 60;

export const POST = jobEndpoint('retry-webhooks', async () => ({
  ...(await retryWebhooks(db)),
}));

export const GET = POST;

/**
 * `poll-pending-transactions` — every minute (docs/ARCHITECTURE.md §6).
 *
 * For any payment where the customer did not complete the return trip, this is
 * the only thing that will ever notice the money arrived. If it stops,
 * payments stop being confirmed and nobody is told — which is what `heartbeat`
 * and a non-200 alarm are for.
 */
import { db } from '@softmato/db';
import { pollPendingTransactions } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { jobEndpoint } from '@/lib/jobs/endpoint';
import { ensureProvidersRegistered } from '@/lib/payments/providers';
import { sendPaymentReceipt } from '@/lib/payments/send-receipt';

export const dynamic = 'force-dynamic';

/**
 * A minute's cron cadence with a job allowed to run longer would overlap
 * itself. The batch limit inside the job is the real bound; this is the
 * backstop.
 */
export const maxDuration = 60;

export const POST = jobEndpoint('poll-pending-transactions', async () => {
  // The registry is per-process, and a cron invocation may be the first thing
  // a cold lambda does.
  ensureProvidersRegistered();

  return {
    ...(await pollPendingTransactions(db, recordAudit, sendPaymentReceipt)),
  };
});

export const GET = POST;

/**
 * `expire-stale-sessions` — every 5 minutes (docs/ARCHITECTURE.md §6).
 *
 * Thin, as every job route is: the rules live in `payment-core`.
 */
import { db } from '@softmato/db';
import { expireStaleSessions } from '@softmato/payment-core';

import { recordAudit } from '@/lib/audit';
import { jobEndpoint } from '@/lib/jobs/endpoint';

export const dynamic = 'force-dynamic';

export const POST = jobEndpoint('expire-stale-sessions', async () => {
  const { expired, skipped } = await expireStaleSessions(db, recordAudit);

  return { expired, skipped };
});

/**
 * Cron runners differ on the verb they use, and a job that silently never
 * fires because the scheduler sent GET is the failure the dead-man's switch
 * exists to catch — better to accept both than to depend on the setting.
 */
export const GET = POST;

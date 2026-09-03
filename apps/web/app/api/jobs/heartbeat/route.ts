/**
 * `heartbeat` — every 5 minutes. The dead-man's switch.
 *
 * "If none arrives for 15 minutes, alert. Otherwise cron can stop silently and
 * you find out from a customer" (docs/ENVIRONMENT.md §6). That is the whole
 * point: since Khalti confirmation depends on cron, a scheduler that quietly
 * stops does not look like an outage — the site stays up, checkout still
 * works, and payments simply stop being confirmed.
 *
 * So this does not merely return 200. It touches the database, because a
 * heartbeat that cannot tell "cron is running" from "cron is running and the
 * database is reachable" would keep reassuring an external monitor through
 * exactly the failure that stops every other job.
 *
 * It also reports the backlog, so the monitor can alarm on work piling up
 * rather than only on silence — a job that runs every minute and settles
 * nothing is as broken as one that never runs.
 */
import { sql } from 'drizzle-orm';

import { db, transactions } from '@softmato/db';

import { jobEndpoint } from '@/lib/jobs/endpoint';

export const dynamic = 'force-dynamic';

export const POST = jobEndpoint('heartbeat', async () => {
  const now = new Date();

  const [row] = await db
    .select({
      live: sql<number>`count(*) FILTER (WHERE ${transactions.status} IN ('created','pending'))::int`,
      flagged: sql<number>`count(*) FILTER (WHERE ${transactions.status} = 'reconciliation_required')::int`,
      /*
       * Live transactions whose poll fell due more than ten minutes ago. On a
       * one-minute cadence this should be zero; anything else means the poller
       * is not keeping up, or has stopped while this endpoint kept answering.
       */
      overdue: sql<number>`count(*) FILTER (WHERE ${transactions.status} IN ('created','pending') AND ${transactions.nextPollAt} < ${new Date(now.getTime() - 10 * 60_000)})::int`,
    })
    .from(transactions);

  return {
    at: now.toISOString(),
    liveTransactions: row?.live ?? 0,
    flaggedForReview: row?.flagged ?? 0,
    overduePolls: row?.overdue ?? 0,
  };
});

export const GET = POST;

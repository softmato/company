import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { contactSubmissions, db } from '@softmato/db';

import { env } from '@/lib/env';
import { getSettings } from '@/lib/settings/queries';

/**
 * Contact form rate limiting, in Postgres.
 *
 * Deliberately not Upstash. The `contact_submissions_rate_idx` index on
 * (ip_hash, created_at) exists for this query, the limit is per hour rather
 * than per second, and a low-traffic marketing form does not justify another
 * hosted service to run — or another one that has to be stubbed in CI.
 * Revisit if the payment API ever needs per-request limiting; that is a
 * different problem with different latency requirements.
 */

/**
 * Submissions allowed from one address per window. The limit is a setting —
 * a founder watching spam arrive should be able to tighten it from the panel
 * at that moment, not wait for a deploy.
 */
const WINDOW_MS = 60 * 60 * 1000;

/**
 * The raw IP is never stored. It is personal data with no use here that a hash
 * cannot serve, and the salt means the table cannot be scanned for a known
 * address.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${env.AUTH_SECRET}:${ip}`).digest('hex');
}

export async function isRateLimited(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const settings = await getSettings();
  const limit = settings.number('website.contact_rate_limit_per_hour');

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .where(
      and(
        eq(contactSubmissions.ipHash, ipHash),
        gte(contactSubmissions.createdAt, since),
      ),
    );

  return (row?.count ?? 0) >= limit;
}

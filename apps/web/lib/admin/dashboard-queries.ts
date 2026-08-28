import 'server-only';
import { sql } from 'drizzle-orm';
import { auditLogs, db } from '@softmato/db';
import { desc } from 'drizzle-orm';

/**
 * What the dashboard can honestly show today.
 *
 * Deliberately short. Revenue, approvals and overdue invoices are Phase 3 and
 * 6 — the tables exist but nothing writes to them, and a tile reading
 * `0.00` because a feature is unbuilt is worse than no tile: it says the
 * company collected nothing this month.
 */

/**
 * The one number that must always be zero. If `v_unbalanced_journals` ever
 * returns a row the books are wrong and nothing else on the page matters
 * (docs/TESTING.md §2).
 */
export async function unbalancedJournalCount(): Promise<number> {
  const result = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM v_unbalanced_journals`,
  );

  return Number(result.rows[0]?.count ?? '0');
}

export interface ActivityEntry {
  id: number;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorId: string | null;
  occurredAt: Date;
}

/** The most recent admin mutations, newest first. */
export async function recentActivity(limit = 8): Promise<ActivityEntry[]> {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      actorId: auditLogs.actorId,
      occurredAt: auditLogs.occurredAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.occurredAt))
    .limit(limit);
}

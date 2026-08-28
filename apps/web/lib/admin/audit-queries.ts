import 'server-only';
import { desc, sql } from 'drizzle-orm';
import { auditLogs, db } from '@softmato/db';

export interface AuditRow {
  id: number;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  occurredAt: Date;
}

/**
 * The audit stream, newest first.
 *
 * `action` filters on an exact match rather than a prefix: the vocabulary is
 * dotted and closed (`cms.publish`, `settings.save`), so a prefix search would
 * only ever be a slower way to spell the same thing.
 */
export async function listAuditEntries({
  action,
  limit = 100,
}: {
  action?: string | undefined;
  limit?: number;
} = {}): Promise<AuditRow[]> {
  const query = db
    .select({
      id: auditLogs.id,
      actorType: auditLogs.actorType,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      beforeState: auditLogs.beforeState,
      afterState: auditLogs.afterState,
      ipAddress: auditLogs.ipAddress,
      requestId: auditLogs.requestId,
      occurredAt: auditLogs.occurredAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.occurredAt))
    .limit(limit);

  return action ? query.where(sql`${auditLogs.action} = ${action}`) : query;
}

/** Every action that actually appears in the log, for the filter. */
export async function auditActions(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action);

  return rows.map((row) => row.action);
}

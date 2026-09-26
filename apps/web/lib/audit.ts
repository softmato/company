/**
 * Audit logging. Append-only, enforced by trigger.
 *
 * "On Vercel there is no SSH — the audit log is the debugger" (docs/RULES.md §5).
 * Log every admin mutation, every refund decision, every credential change.
 */
import 'server-only';
import { auditLogs, db, type DbTx } from '@softmato/db';

/** `client` is a person signed in to the client portal (`client_users.id`). */
export type AuditActorType = 'admin' | 'application' | 'system' | 'client';

export interface AuditEntry {
  actorType: AuditActorType;
  /** Admin id, client_id, or a job name. */
  actorId?: string | null;
  /** Dotted verb: 'refund.approve', 'application.rotate_secret'. */
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Field names that must never reach the audit log in plaintext. Before/after
 * snapshots are convenient precisely because they are indiscriminate, which is
 * how a password hash or a TOTP secret ends up somewhere it should not be.
 */
const REDACTED_KEYS = new Set([
  'passwordHash',
  'password_hash',
  'password',
  'totpSecret',
  'totp_secret',
  'secretHash',
  'secret_hash',
  'webhookSecret',
  'webhook_secret',
  'secret',
  'token',
  'authorization',
]);

function redact(
  state: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!state) return null;

  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      REDACTED_KEYS.has(key) ? '[redacted]' : value,
    ]),
  );
}

/**
 * Pass `tx` when the audited change is itself transactional, so the record and
 * the change commit or roll back together. An audit row for a change that never
 * happened is worse than no row at all.
 */
export async function recordAudit(entry: AuditEntry, tx?: DbTx): Promise<void> {
  const executor = tx ?? db;

  await executor.insert(auditLogs).values({
    actorType: entry.actorType,
    actorId: entry.actorId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    beforeState: redact(entry.beforeState),
    afterState: redact(entry.afterState),
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    requestId: entry.requestId ?? null,
  });
}

/** Pulls the client address and user agent off a request, proxy-aware. */
export function requestContext(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = request.headers.get('x-forwarded-for');

  return {
    ipAddress: forwarded?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent'),
  };
}

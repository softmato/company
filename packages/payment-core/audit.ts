/**
 * Auditing, injected rather than imported.
 *
 * `recordAudit()` lives in `apps/web/lib/audit.ts` behind `server-only`, and
 * this package may not import from the app (docs/FOLDER_STRUCTURE.md). So the
 * operations that must leave a trail take the recorder as a parameter.
 *
 * It is a required parameter, never optional. "Log every credential change,
 * every refund decision" (docs/RULES.md §5) survives a refactor only if
 * forgetting it is a type error rather than a habit.
 */
import type { DbTx } from '@softmato/db';

export interface AuditRecord {
  actorType: 'admin' | 'application' | 'system';
  /** Admin id, client_id, or a job name. */
  actorId?: string | null;
  /** Dotted verb: 'application.rotate_secret', 'payment.approve'. */
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

/**
 * Pass `tx` when the audited change is transactional, so the record and the
 * change commit or roll back together.
 */
export type AuditRecorder = (
  entry: AuditRecord,
  tx?: DbTx,
) => Promise<void>;

/** Who asked for an operation. Every mutating entry point carries one. */
export interface Actor {
  type: 'admin' | 'application' | 'system';
  /** Admin id, client_id, or a job name. */
  id: string;
}

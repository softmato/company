/**
 * `Idempotency-Key` handling for mutating `/api/v1` requests (docs/API.md §1).
 *
 * "Every state-changing write is idempotent, keyed on a provider event ID or a
 * client-supplied Idempotency-Key" (docs/RULES.md §2.4). The guarantee that
 * matters: **the same key twice returns the same session, not two.**
 *
 * The claim, the work and the stored response all happen inside one
 * transaction. That is not tidiness — if the key were claimed in a separate
 * transaction from the work, a crash in between would leave a key marked done
 * for a session that does not exist, and the retry would be answered with a
 * replay of nothing. And if the response were stored after the work committed,
 * a crash in between would let the retry do the work a second time.
 *
 * Concurrency is left to the unique index. A second request with the same key
 * blocks on the primary key until the first commits, then loses with 23505 and
 * reads back what the winner stored.
 */
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import { db, idempotencyKeys, type DbTx } from '@softmato/db';

import { PaymentError } from './errors';

/** How long a key is remembered. A retry after this re-does the work. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export interface IdempotentRequest {
  applicationId: number;
  /** The client-supplied header value. */
  key: string;
  /** Distinguishes the same key used against two endpoints. */
  endpoint: string;
  /** The parsed request body, hashed to detect a changed payload. */
  request: unknown;
}

export interface HandlerResult<T> {
  status: number;
  body: T;
}

export interface IdempotentOutcome<T> extends HandlerResult<T> {
  /** True when this response came from the store rather than the handler. */
  replayed: boolean;
}

export async function withIdempotency<T extends Record<string, unknown>>(
  request: IdempotentRequest,
  handler: (tx: DbTx) => Promise<HandlerResult<T>>,
): Promise<IdempotentOutcome<T>> {
  assertKeyShape(request.key);

  const requestHash = hashRequest(request.endpoint, request.request);

  const alreadyDone = await read(request);
  if (alreadyDone) return replay(alreadyDone, requestHash, request);

  try {
    return await db.transaction(async (tx) => {
      await tx.insert(idempotencyKeys).values({
        applicationId: request.applicationId,
        key: request.key,
        endpoint: request.endpoint,
        requestHash,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + RETENTION_MS),
      });

      const result = await handler(tx);

      await tx
        .update(idempotencyKeys)
        .set({
          responseStatus: result.status,
          responseBody: result.body,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(idempotencyKeys.applicationId, request.applicationId),
            eq(idempotencyKeys.key, request.key),
          ),
        );

      return { ...result, replayed: false };
    });
  } catch (error) {
    // Narrow on purpose. The handler can raise unique violations of its own —
    // a duplicate `external_ref`, a repeated `provider_ref` — and reporting
    // those as an idempotency conflict would hide the actual defect behind a
    // plausible-looking 409. Only losing the race for *this key* is a race.
    if (!isIdempotencyKeyViolation(error)) throw error;

    // The winner's transaction has committed by the time ours failed, so their
    // answer is readable.
    const winner = await read(request);
    if (winner) return replay(winner, requestHash, request);

    throw new PaymentError(
      'IDEMPOTENCY_CONFLICT',
      'Idempotency key was claimed concurrently and left no response',
      { key: request.key, endpoint: request.endpoint },
    );
  }
}

type StoredKey = typeof idempotencyKeys.$inferSelect;

async function read(request: IdempotentRequest): Promise<StoredKey | undefined> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.applicationId, request.applicationId),
        eq(idempotencyKeys.key, request.key),
      ),
    )
    .limit(1);

  return row;
}

function replay<T extends Record<string, unknown>>(
  stored: StoredKey,
  requestHash: string,
  request: IdempotentRequest,
): IdempotentOutcome<T> {
  // A key reused with a different body is the caller's bug, and answering it
  // with the first response would hide it. 409 (docs/API.md §1).
  if (stored.endpoint !== request.endpoint || stored.requestHash !== requestHash) {
    throw new PaymentError(
      'IDEMPOTENCY_CONFLICT',
      'Idempotency key reused with a different request',
      {
        key: request.key,
        storedEndpoint: stored.endpoint,
        endpoint: request.endpoint,
      },
    );
  }

  if (stored.completedAt === null || stored.responseBody === null) {
    // The row exists but has no answer, which can only mean a request that is
    // still in flight — a committed transaction always wrote both.
    throw new PaymentError(
      'IDEMPOTENCY_CONFLICT',
      'A request with this key is still in flight',
      { key: request.key },
    );
  }

  return {
    status: stored.responseStatus ?? 200,
    body: stored.responseBody as T,
    replayed: true,
  };
}

/**
 * Canonical JSON — object keys sorted at every depth — so that two bodies that
 * differ only in key order hash the same. Without it, a client that serialises
 * its payload differently on a retry would be told its key was reused.
 */
function hashRequest(endpoint: string, body: unknown): string {
  return createHash('sha256')
    .update(`${endpoint}\n${canonical(body)}`)
    .digest('hex');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';

  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`);

  return `{${entries.join(',')}}`;
}

function assertKeyShape(key: string): void {
  if (key.length < 8 || key.length > 255) {
    throw new PaymentError(
      'VALIDATION_FAILED',
      'Idempotency-Key must be between 8 and 255 characters',
      { length: key.length },
    );
  }
}

/** A unique violation on the idempotency table's own primary key, only. */
function isIdempotencyKeyViolation(error: unknown): boolean {
  const detail = error as { code?: string; constraint?: string } | null;

  if (detail?.code !== '23505') return false;

  if (detail.constraint) return detail.constraint === 'idempotency_keys_pkey';

  // Some drivers drop `constraint`; fall back to the message, still scoped to
  // this table rather than to unique violations in general.
  const text = error instanceof Error ? error.message : String(error);
  return text.includes('idempotency_keys');
}

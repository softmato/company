/**
 * Driver switch: `pg` locally, Neon's HTTP/WebSocket driver in production.
 *
 * The two drivers do NOT behave identically around transactions — the HTTP
 * driver batches, the pool does not. Anything touching the ledger must be
 * exercised against a Neon branch before a phase is accepted (PHASES.md,
 * "Ongoing after each phase").
 */
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from 'ws';

import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/softmato_dev';

const isNeon = /neon\.tech/i.test(connectionString);

/**
 * Both drivers expose the same Drizzle query surface, so callers get one
 * concrete type. That is a typing convenience only — it does NOT mean the two
 * behave identically at runtime, which is why every phase is also exercised
 * against a Neon branch.
 */
let pool: NeonPool | PgPool;

function createDb(): NodePgDatabase<typeof schema> {
  if (isNeon) {
    // WebSocket pool, not the HTTP driver: real transactions are required for
    // postJournal(). See docs/DATABASE.md §2.1.
    neonConfig.webSocketConstructor = ws;
    pool = new NeonPool({ connectionString });
    return drizzleNeon(pool, {
      schema,
    }) as unknown as NodePgDatabase<typeof schema>;
  }
  pool = new PgPool({ connectionString });
  return drizzlePg(pool, { schema });
}

export const db = createDb();

/** For scripts and test teardown. Serverless request handlers must not call it. */
export async function closeDb(): Promise<void> {
  await pool.end();
}
export type Db = NodePgDatabase<typeof schema>;
/** A transaction handle — what every ledger write must be given. */
export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];
/**
 * Either the pool or an open transaction.
 *
 * For the operations that legitimately run both ways: the API path reads a
 * session inside the transaction `withIdempotency` owns, while a server
 * component rendering the checkout page reads the same session on the pool with
 * no transaction in sight. Both are correct, and a function that serves both
 * should say so rather than force a caller to open a transaction it does not
 * need.
 *
 * **This is not for ledger writes.** Anything that posts a journal, or that
 * must be atomic across more than one statement, still takes `DbTx` — the point
 * of that type is that the caller cannot forget the transaction.
 */
export type DbLike = Db | DbTx;
export { schema };

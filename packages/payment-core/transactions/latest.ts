/**
 * The attempt a returning customer is coming back from.
 *
 * The callback URL carries a session id, not a transaction id — a session may
 * have several attempts behind it, because a customer who picks eSewa, gives
 * up and picks Khalti leaves two rows. So "which payment did they just make?"
 * has to be answered from our side.
 *
 * **The newest attempt, not the newest live one.** Ordering by `created_at`
 * and taking the first is deliberate: if the most recent attempt has already
 * settled, that is the answer — the customer is returning to a page for a
 * payment that is done, and a filter for live rows would skip past it to an
 * older abandoned attempt and re-poll something they are no longer doing.
 */
import { desc, eq } from 'drizzle-orm';

import { transactions, type DbLike, type Transaction } from '@softmato/db';

export async function latestAttempt(
  tx: DbLike,
  sessionId: string,
): Promise<Transaction | undefined> {
  const [latest] = await tx
    .select()
    .from(transactions)
    .where(eq(transactions.sessionId, sessionId))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(1);

  return latest;
}

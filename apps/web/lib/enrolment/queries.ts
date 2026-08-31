import 'server-only';

import { eq } from 'drizzle-orm';

import { adminUsers, db } from '@softmato/db';

import type { EnrolmentSubject } from './token';

/**
 * The subject a token is checked against. Deliberately narrow: nothing here
 * touches `passwordHash` or `totpSecret`, so an enrolment page cannot leak
 * either by accident.
 */
export async function findEnrolmentSubject(
  id: number,
): Promise<EnrolmentSubject | null> {
  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      isActive: adminUsers.isActive,
      totpEnabled: adminUsers.totpEnabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return row ?? null;
}

/**
 * Commits a confirmed enrolment: the secret lands and the account goes active.
 *
 * Both columns move together because the database will not have it otherwise —
 * `CHECK (NOT is_active OR totp_enabled)` (docs/DATABASE.md §2.4). Writing them
 * in one statement is what keeps that true rather than momentarily true.
 */
export async function activateWithSecret(
  id: number,
  encryptedSecret: string,
): Promise<void> {
  await db
    .update(adminUsers)
    .set({ totpSecret: encryptedSecret, totpEnabled: true, isActive: true })
    .where(eq(adminUsers.id, id));
}

/** Replaces the secret of an admin who is already enrolled and signed in. */
export async function replaceSecret(
  id: number,
  encryptedSecret: string,
): Promise<void> {
  await db
    .update(adminUsers)
    .set({ totpSecret: encryptedSecret, totpEnabled: true })
    .where(eq(adminUsers.id, id));
}

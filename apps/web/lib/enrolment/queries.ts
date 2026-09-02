import 'server-only';

import { and, eq, type SQL } from 'drizzle-orm';

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
 * One admin's stored secret, still encrypted.
 *
 * Kept apart from `findEnrolmentSubject`, which deliberately cannot see this
 * column, rather than widening that query: the rotation page needs the
 * ciphertext as derivation input and never displays it, and a single query
 * that returns both shapes is how the narrow one stops being narrow.
 */
export async function findTotpSecret(id: number): Promise<string | null> {
  const [row] = await db
    .select({ totpSecret: adminUsers.totpSecret })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return row?.totpSecret ?? null;
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

/**
 * An admin who was created but never finished enrolment, named for a screen
 * that is about to act on them.
 *
 * Carries `name` on top of what a token needs, because both things that use it
 * — re-issuing a link and deleting the row — are shown to a founder who picked
 * a person out of a list, not an id.
 */
export interface PendingAdmin extends EnrolmentSubject {
  name: string;
}

/**
 * Matches only the un-enrolled shape: inactive, and no second factor.
 *
 * Every statement below composes this rather than checking the flags in
 * TypeScript first. A read-then-write leaves a window in which the target
 * finishes enrolling, and the whole point of these two operations is that they
 * must never reach an admin who can sign in.
 */
function pendingOnly(match: SQL): SQL | undefined {
  return and(
    match,
    eq(adminUsers.isActive, false),
    eq(adminUsers.totpEnabled, false),
  );
}

/** Null for an id that is absent, active, or already enrolled. */
export async function findPendingAdmin(
  id: number,
): Promise<PendingAdmin | null> {
  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
    })
    .from(adminUsers)
    .where(pendingOnly(eq(adminUsers.id, id)))
    .limit(1);

  if (!row) return null;

  return { ...row, isActive: false, totpEnabled: false };
}

/**
 * Deletes an admin who never enrolled.
 *
 * Deleting is the right verb here and nowhere else in this table. A row that
 * never enrolled holds nothing — no secret, no session, no history worth
 * keeping — so removing it is tidying a mistyped invite, not erasing a
 * colleague. An admin who *has* enrolled is deactivated instead, so the
 * `audit_logs` rows naming them keep resolving to someone.
 *
 * The guard is in the `where`, so this cannot delete an active founder even if
 * a caller asks it to. Returns null when nothing matched, which the caller
 * reports rather than treating as success.
 */
export async function deletePendingAdmin(
  id: number,
): Promise<PendingAdmin | null> {
  const [row] = await db
    .delete(adminUsers)
    .where(pendingOnly(eq(adminUsers.id, id)))
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
    });

  if (!row) return null;

  return { ...row, isActive: false, totpEnabled: false };
}

/**
 * Takes over an admin row that was created but never enrolled, so a fresh
 * enrolment link can be minted for it.
 *
 * The address is unique, so a second invite to someone who never finished
 * setup used to be a dead end: the insert conflicts, and the only way back was
 * `pnpm admin:enrol` at a terminal. That is the wrong place for it — losing the
 * handoff QR is an ordinary thing to do, and the dashboard is where the person
 * who lost it is standing.
 *
 * **The `where` clause is the safety, not a caller's discipline.** `pendingOnly`
 * in the statement itself means an enrolled admin cannot be reclaimed even by a
 * caller that asks for it — no read-then-write window where the target finishes
 * enrolling in between, and no way for a mistyped address to overwrite a
 * working founder's password.
 *
 * Returns null when no such row exists, which the caller reads as "that
 * address belongs to a real admin" and refuses.
 */
export async function reclaimPendingAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<EnrolmentSubject | null> {
  const [row] = await db
    .update(adminUsers)
    .set({ name: input.name, passwordHash: input.passwordHash })
    .where(pendingOnly(eq(adminUsers.email, input.email)))
    .returning({ id: adminUsers.id, email: adminUsers.email });

  if (!row) return null;

  return { id: row.id, email: row.email, isActive: false, totpEnabled: false };
}

/**
 * Creates an admin in the one shape an un-enrolled admin is allowed to take:
 * inactive, no secret, `totpEnabled` false.
 *
 * That is not a placeholder — it is the gap the database leaves. The
 * constraint is `CHECK (NOT is_active OR totp_enabled)` (docs/DATABASE.md
 * §2.4), so "inactive" is precisely where an account with no second factor is
 * permitted to sit, and `authorize()` rejects `!isActive` before it looks at a
 * password. The row therefore cannot sign in until enrolment writes both
 * columns together via `activateWithSecret`.
 *
 * `(isActive: false, totpEnabled: false)` is also the state an enrolment token
 * is signed over, which is what makes the link die on use — see `token.ts`.
 *
 * Returns null when the email is taken. Uniqueness is left to the database
 * rather than checked first: a select-then-insert can interleave with another
 * insert, and the unique index is the only check that cannot.
 */
export async function createPendingAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<EnrolmentSubject | null> {
  const [created] = await db
    .insert(adminUsers)
    .values({
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      totpSecret: null,
      totpEnabled: false,
      isActive: false,
      role: 'founder',
    })
    .onConflictDoNothing({ target: adminUsers.email })
    .returning({ id: adminUsers.id });

  if (!created) return null;

  return {
    id: created.id,
    email: input.email,
    isActive: false,
    totpEnabled: false,
  };
}

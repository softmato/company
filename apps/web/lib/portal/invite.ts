/**
 * Invitations: how a client person gets a password, and how they reset one.
 *
 * The founder creates the person; the system mints a link; the person opens it
 * and chooses a password. Re-issuing a link to someone who already has a
 * password is the reset path — accepting it replaces the password and ends
 * every session they hold.
 *
 * The link is shown to the founder to pass on, and nothing is emailed yet: the
 * sending domain is not verified (docs/MEMORY.md, Phase 2).
 */
import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { clientUsers, clients, db } from '@softmato/db';

import { env } from '@/lib/env';
import { hashPassword } from '@/lib/password.core';

import { agencyOrigin } from './origin';
import { endAllSessionsFor } from './session';
import { hashToken, isTokenShape, newToken } from './token';

/** A week: long enough to survive a busy client, short enough to go stale. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Where clients reach the portal — `PORTAL_URL`, else the `agency.` host. */
export function portalBaseUrl(): string {
  return (env.PORTAL_URL ?? agencyOrigin(env.NEXT_PUBLIC_APP_URL)).replace(
    /\/$/,
    '',
  );
}

export interface IssuedInvite {
  url: string;
  expiresAt: Date;
}

/** Replaces any earlier link — only the newest one works. */
export async function issueInvite(clientUserId: number): Promise<IssuedInvite> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await db
    .update(clientUsers)
    .set({ inviteTokenHash: hashToken(token), inviteExpiresAt: expiresAt })
    .where(eq(clientUsers.id, clientUserId));

  return { url: `${portalBaseUrl()}/invite/${token}`, expiresAt };
}

export interface Invitee {
  id: number;
  name: string;
  email: string;
  clientName: string;
  hasPassword: boolean;
}

function validInvite(token: string) {
  return and(
    eq(clientUsers.inviteTokenHash, hashToken(token)),
    gt(clientUsers.inviteExpiresAt, new Date()),
    eq(clientUsers.isActive, true),
  );
}

/** Null for a malformed, unknown, expired or used link — all the same answer. */
export async function findInvitee(token: string): Promise<Invitee | null> {
  if (!isTokenShape(token)) return null;

  const [row] = await db
    .select({
      id: clientUsers.id,
      name: clientUsers.name,
      email: clientUsers.email,
      clientName: clients.name,
      passwordHash: clientUsers.passwordHash,
    })
    .from(clientUsers)
    .innerJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(and(validInvite(token), isNull(clients.archivedAt)))
    .limit(1);

  if (!row) return null;

  const { passwordHash, ...rest } = row;
  return { ...rest, hasPassword: passwordHash !== null };
}

/**
 * Sets the password and spends the link in one statement, so two tabs racing
 * the same link cannot both succeed. Returns the person's id, or null.
 */
export async function acceptInvite(
  token: string,
  password: string,
): Promise<number | null> {
  if (!isTokenShape(token)) return null;

  const passwordHash = await hashPassword(password);

  const [row] = await db
    .update(clientUsers)
    .set({ passwordHash, inviteTokenHash: null, inviteExpiresAt: null })
    .where(validInvite(token))
    .returning({ id: clientUsers.id });

  if (!row) return null;

  await endAllSessionsFor(row.id);
  return row.id;
}

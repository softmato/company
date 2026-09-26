/**
 * Client portal sessions: an opaque cookie backed by a `client_sessions` row.
 *
 * Nothing here touches Auth.js. The admin session is a JWT whose `mfa` claim
 * the admin layout checks; a client must never hold anything that code could
 * mistake for one, so the two live under different cookies and different
 * tables and share no helper.
 *
 * **The viewer is the only source of a client id.** Every portal query takes
 * `viewer.clientId` from here and never from a URL (docs/RULES.md §6).
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { clientSessions, clientUsers, clients, db } from '@softmato/db';

import { hashToken, newToken } from './token';

const COOKIE = 'softmato_portal';

/** Two weeks. A client checks in on a project weekly, not daily. */
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface PortalViewer {
  userId: number;
  name: string;
  email: string;
  clientId: number;
  clientName: string;
  customerId: number;
}

export async function startPortalSession(clientUserId: number): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db
    .insert(clientSessions)
    .values({ id: hashToken(token), clientUserId, expiresAt });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * The signed-in client person, or null.
 *
 * A deactivated person and an archived client both read as signed out, on the
 * next request — that is why sessions are rows.
 */
export const currentViewer = cache(async (): Promise<PortalViewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      userId: clientUsers.id,
      name: clientUsers.name,
      email: clientUsers.email,
      clientId: clients.id,
      clientName: clients.name,
      customerId: clients.customerId,
    })
    .from(clientSessions)
    .innerJoin(clientUsers, eq(clientUsers.id, clientSessions.clientUserId))
    .innerJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(
      and(
        eq(clientSessions.id, hashToken(token)),
        gt(clientSessions.expiresAt, new Date()),
        eq(clientUsers.isActive, true),
        isNull(clients.archivedAt),
      ),
    )
    .limit(1);

  return row ?? null;
});

/** For pages and actions: the viewer, or a redirect to sign in. */
export async function requireViewer(): Promise<PortalViewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect('/login');
  return viewer;
}

export async function endPortalSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    await db
      .delete(clientSessions)
      .where(eq(clientSessions.id, hashToken(token)));
  }

  jar.delete(COOKIE);
}

/** Every session a person holds — on a password change or deactivation. */
export async function endAllSessionsFor(clientUserId: number): Promise<void> {
  await db
    .delete(clientSessions)
    .where(eq(clientSessions.clientUserId, clientUserId));
}

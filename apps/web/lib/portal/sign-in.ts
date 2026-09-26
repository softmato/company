/**
 * Client portal sign-in: email and password, throttled per address.
 *
 * No TOTP. The portal holds project files and invoices, not money movement or
 * credentials, and docs/ARCHITECTURE.md §7 sets its boundary at "session
 * cookie, tenant-scoped at the data layer". The throttle is what stands in for
 * a second factor against guessing.
 */
import 'server-only';
import { and, count, eq, gte } from 'drizzle-orm';

import { auditLogs, clientUsers, clients, db } from '@softmato/db';

import { recordAudit } from '@/lib/audit';
import { DUMMY_HASH, verifyPassword } from '@/lib/password.core';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export type SignInOutcome =
  | { ok: true; userId: number }
  | { ok: false; reason: 'credentials' | 'throttled' };

/**
 * Failures counted from the audit log, which already records every one. A
 * table of its own would be a second copy of the same fact.
 */
async function recentFailures(email: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, 'portal.login_failed'),
        eq(auditLogs.resourceId, email),
        gte(auditLogs.occurredAt, new Date(Date.now() - WINDOW_MS)),
      ),
    );

  return row?.n ?? 0;
}

export async function verifyClientSignIn(
  rawEmail: string,
  password: string,
): Promise<SignInOutcome> {
  const email = rawEmail.trim().toLowerCase();

  if ((await recentFailures(email)) >= MAX_FAILURES) {
    return { ok: false, reason: 'throttled' };
  }

  const [user] = await db
    .select({
      id: clientUsers.id,
      passwordHash: clientUsers.passwordHash,
      isActive: clientUsers.isActive,
      archivedAt: clients.archivedAt,
    })
    .from(clientUsers)
    .innerJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(eq(clientUsers.email, email))
    .limit(1);

  // Constant work whether or not the account exists.
  const passwordOk = await verifyPassword(
    user?.passwordHash ?? DUMMY_HASH,
    password,
  );

  if (
    !user ||
    !user.passwordHash ||
    !user.isActive ||
    user.archivedAt ||
    !passwordOk
  ) {
    await recordAudit({
      actorType: 'system',
      action: 'portal.login_failed',
      resourceType: 'client_user',
      resourceId: email,
    });
    return { ok: false, reason: 'credentials' };
  }

  await db
    .update(clientUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(clientUsers.id, user.id));

  await recordAudit({
    actorType: 'client',
    actorId: String(user.id),
    action: 'portal.login',
    resourceType: 'client_user',
    resourceId: String(user.id),
  });

  return { ok: true, userId: user.id };
}

import 'server-only';

import { asc } from 'drizzle-orm';

import { adminUsers, db } from '@softmato/db';

export interface RosterEntry {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt: Date | null;
}

/**
 * Who can sign in, for the Security page.
 *
 * Selected column by column rather than `select()`: a bare select would carry
 * `passwordHash` and `totpSecret` into a server component's props, which is
 * serialised to the client. The columns that must never leave the database are
 * kept out by not naming them.
 */
export async function listAdmins(): Promise<RosterEntry[]> {
  return db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      isActive: adminUsers.isActive,
      totpEnabled: adminUsers.totpEnabled,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.id));
}

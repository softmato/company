import 'server-only';

import { auth } from '@/lib/auth';

/**
 * Every server action re-checks the session rather than trusting the layout.
 *
 * The layout guard decides what is *rendered*; a server action is a POST
 * endpoint and is reachable without it. `mfa` is checked explicitly for the
 * same reason it is in the layout — a session that never cleared TOTP must not
 * mutate anything (docs/TESTING.md §9).
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) {
    throw new Error('Not authorised');
  }

  return session.user.id;
}

export function parseId(raw: FormDataEntryValue | null): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Bad id');
  return id;
}

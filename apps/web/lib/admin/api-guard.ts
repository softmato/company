import 'server-only';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

/**
 * The admin check for API routes under `/api/admin`.
 *
 * Same rule the CMS server actions apply in `cms/actions/shared.ts`, and for
 * the same reason: a route handler is a POST endpoint reachable without ever
 * rendering the admin layout, so the layout's guard proves nothing here. `mfa`
 * is checked explicitly — a session that never cleared TOTP must not be able
 * to act (docs/TESTING.md §9).
 *
 * It returns the failure rather than throwing so a route can answer with a
 * real 401 and a JSON body the client already knows how to read.
 */
export type AdminGuard =
  { ok: true; adminId: string } | { ok: false; response: NextResponse };

export async function requireAdminApi(): Promise<AdminGuard> {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: 'Not authorised.' },
        { status: 401 },
      ),
    };
  }

  return { ok: true, adminId: session.user.id };
}

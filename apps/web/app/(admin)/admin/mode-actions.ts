'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';
import { ADMIN_MODE_COOKIE } from '@/lib/admin/mode';

/**
 * Switch the whole admin section between Sandbox and Production.
 *
 * Guarded like any other admin action. It only chooses which rows are shown,
 * but "which rows are shown" is the difference between reporting revenue and
 * reporting a test, and an unauthenticated caller has no business setting it.
 *
 * `revalidatePath('/admin', 'layout')` rather than the current page: every
 * page under the layout reads this cookie, so they are all now stale.
 */
export async function setAdminMode(formData: FormData): Promise<void> {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) return;

  const requested = formData.get('mode');
  const mode = requested === 'test' ? 'test' : 'live';

  const store = await cookies();

  store.set(ADMIN_MODE_COOKIE, mode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/admin', 'layout');
}

/**
 * admin.softmato.com — session guard + navigation.
 *
 * This is the authoritative gate. `middleware.ts` runs on the edge and is a
 * cheap first pass; this layout runs on the server and is what actually decides
 * whether a request sees admin data.
 *
 * `mfa` is checked explicitly rather than assumed from the presence of a
 * session. A session that did not clear TOTP must never reach /admin
 * (docs/TESTING.md §9).
 */
import { redirect } from 'next/navigation';

import { initials } from '@/lib/initials';
import { auth } from '@/lib/auth';
import { AdminNav } from '@/components/admin/admin-nav';
import { Wordmark } from '@/components/public/wordmark';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const session = await auth();

  if (!session?.user || session.user.mfa !== true) {
    redirect('/login');
  }

  const email = session.user.email ?? '';
  const name = session.user.name ?? email;

  return (
    <div className="flex min-h-full flex-1">
      <AdminNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
          <Wordmark className="text-[17px]" />

          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full bg-primary/10 font-mono text-[11px] text-primary"
            >
              {initials(name)}
            </span>
            <span className="text-sm text-muted-foreground">{email}</span>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

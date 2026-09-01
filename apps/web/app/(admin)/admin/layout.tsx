/**
 * admin.softmato.com — session guard + navigation.
 *
 * This is the authoritative gate. `proxy.ts` runs on every matched request and
 * is a deliberately cheap first pass; this layout is what actually decides
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
    <div className="min-h-dvh">
      <AdminNav />

      <div className="ml-56 flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
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

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

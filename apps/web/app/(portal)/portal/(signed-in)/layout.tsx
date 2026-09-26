import { MessageCircleQuestion } from 'lucide-react';

import { PortalHeader } from '@/components/portal/portal-header';
import { requireViewer } from '@/lib/portal/session';

/**
 * The session guard for every signed-in portal page. Pages call
 * `requireViewer()` again for the client id they query with — it is cached per
 * request, so that costs nothing, and a page never depends on its layout
 * having run.
 */
export default async function SignedInLayout({
  children,
}: LayoutProps<'/portal'>) {
  const viewer = await requireViewer();

  return (
    <div className="relative isolate flex flex-1 flex-col bg-[radial-gradient(70%_40%_at_0%_0%,rgba(16,185,129,0.08),transparent),radial-gradient(60%_40%_at_100%_30%,rgba(139,92,246,0.06),transparent)]">
      <PortalHeader viewer={viewer} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        <MessageCircleQuestion
          className="size-4 text-emerald-600"
          aria-hidden="true"
        />
        Questions about anything here? Write in the project’s messages and the
        team will answer.
      </footer>
    </div>
  );
}

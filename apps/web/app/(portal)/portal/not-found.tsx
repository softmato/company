import Link from 'next/link';

import { Wordmark } from '@/components/public/wordmark';

/** A missing project reads the same as someone else's: not here. */
export default function PortalNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Wordmark className="text-[18px]" />
      <div className="max-w-sm space-y-2">
        <h1 className="headline text-xl">Nothing here</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This page does not exist, or it is not part of your account.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm font-medium text-primary hover:underline"
      >
        Back to your projects
      </Link>
    </main>
  );
}

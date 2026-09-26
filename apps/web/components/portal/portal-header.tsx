import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';

import { signOut } from '@/app/(portal)/portal/actions/sign-out';
import { Wordmark } from '@/components/public/wordmark';
import { BRAND_MARK_192 } from '@/lib/brand/assets';
import { initials } from '@/lib/initials';
import type { PortalViewer } from '@/lib/portal/session';

import { PortalNav } from './portal-nav';

export function PortalHeader({ viewer }: { viewer: PortalViewer }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Image
            src={BRAND_MARK_192}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-lg"
            priority
          />
          <Wordmark className="text-[18px]" />
          <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline">
            Client portal
          </span>
        </Link>

        <div className="hidden md:block">
          <PortalNav />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-medium leading-tight">{viewer.name}</p>
            <p className="text-xs leading-tight text-muted-foreground">
              {viewer.clientName}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[11px] font-medium text-white shadow-sm ring-2 ring-background"
          >
            {initials(viewer.name)}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 pb-2.5 sm:px-5 md:hidden">
        <PortalNav />
      </div>
    </header>
  );
}

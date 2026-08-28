'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/cn';
import { NAV_LINKS } from '@/components/public/nav-links';
import { Wordmark } from '@/components/public/wordmark';

/**
 * The header: wordmark left, a pill of links in the middle, one action right.
 *
 * This is the reference's arrangement, and it replaces the previous system's
 * split between a bare header at the top and a floating nav pinned to the
 * bottom of the viewport. On a page whose sections are full-height light-forms
 * a bar fixed to the bottom sits in the middle of every one of them.
 *
 * It is `fixed`, and it does not adapt to what is under it. The pill carries
 * its own translucent white ground and a blur, so it reads over the light
 * stages and over the one dark section without needing to know which it is
 * over — which is what lets this stay a single element rather than a component
 * that watches the scroll position and re-tints itself.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  /*
   * Close on navigation. Adjusting state during render rather than in an
   * effect: an effect would paint the new page with the menu still covering
   * it, then close it in a second pass. React re-runs this component
   * immediately and discards the first result, so the menu is never shown over
   * the page the reader just asked for.
   */
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {/*
          The wordmark sits on the page, not in a pill.

          The reference gives a pill only to the things that behave like
          controls — the nav group and the call to action — and leaves its
          logotype as plain type on the ground. Putting the name in a chip of
          its own made three floating capsules across the top, which reads as a
          toolbar rather than as a header with one identity and one action in
          it.
        */}
        <Link
          href="/"
          className="flex h-11 items-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="nav-pill hidden h-11 items-center px-1.5 md:flex">
          <ul className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-full px-4 py-2 text-[13px] transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    isActive(link.href)
                      ? 'bg-foreground/8 font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="hidden h-11 items-center rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:inline-flex"
          >
            Get in touch
          </Link>

          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
            className="nav-pill grid size-11 place-items-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:hidden"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              {open ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6.5h14M3 13.5h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="site-menu"
          aria-label="Primary"
          className="nav-pill mx-auto mt-2 max-w-6xl animate-rise overflow-hidden rounded-3xl p-2 md:hidden"
        >
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-2xl px-4 py-3 text-[15px] transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    isActive(link.href)
                      ? 'bg-foreground/8 font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                className="mt-1 block rounded-2xl bg-foreground px-4 py-3 text-center text-[15px] font-medium text-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Get in touch
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Magic UI's bento grid, ported without its two dependencies: shadcn's
 * `Button` became a plain link and Radix's arrow an inline SVG (UI_BRIEF §6 —
 * no UI kit, no icon library). Colours are tokens; the card fill is
 * `.bento-card` in marketing.css.
 *
 * Each card is a `background` (anything, absolutely positioned by the caller)
 * with its copy pinned to the bottom. On `lg` the copy lifts on hover to make
 * room for the call to action; below that the link is always shown, because a
 * touch screen has no hover to reveal it with.
 *
 * Rows are taller than the original's 22rem — 26rem on a phone, where captions
 * wrap to three lines — so a tile's picture and its caption never overlap.
 */
export function BentoGrid({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[26rem] grid-cols-3 gap-4 lg:auto-rows-[24rem]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  name,
  description,
  background,
  href,
  cta,
  className,
}: {
  name: string;
  description: string;
  background: ReactNode;
  href?: string;
  cta?: string;
  className?: string;
}) {
  const link = href && cta && (
    <Link
      href={href}
      className="pointer-events-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
    >
      {cta}
      <svg
        viewBox="0 0 15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
        aria-hidden="true"
      >
        <path d="M8.5 3.5 12.5 7.5 8.5 11.5M12.5 7.5h-10" />
      </svg>
    </Link>
  );

  return (
    <div
      className={cn(
        'bento-card group relative col-span-3 flex flex-col justify-end overflow-hidden',
        className,
      )}
    >
      {background}

      <div className="relative z-10 p-6">
        <div
          className={cn(
            'pointer-events-none flex flex-col gap-1.5 transition-transform duration-300 ease-out',
            link && 'lg:group-hover:-translate-y-8',
          )}
        >
          <h3 className="headline text-[clamp(1.15rem,1.7vw,1.4rem)]">
            {name}
          </h3>
          <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {link && <div className="mt-3 lg:hidden">{link}</div>}
      </div>

      {link && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden translate-y-8 p-6 pt-0 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
          {link}
        </div>
      )}
    </div>
  );
}

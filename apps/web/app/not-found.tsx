import Link from 'next/link';

import { Wordmark } from '@/components/public/wordmark';

/**
 * 404.
 *
 * Renders at the root, so it is reached from every surface — public, admin
 * and checkout alike. That is why it carries its own wordmark and a link home
 * rather than assuming the public header is above it.
 *
 * The copy takes the blame off the reader (docs/handoff/UI_HANDOFF.md §8). A
 * missing page is nearly always our link, our redirect, or our rename.
 *
 * It gets the marketing surface's bloom and display type, because a reader who
 * lands here has almost always come from a page that had them — a 404 set in a
 * different visual language reads as having left the site rather than as
 * having missed a page on it.
 */
export default function NotFound() {
  return (
    <main className="stage flex w-full flex-1 flex-col justify-center px-6 py-24">
      <div
        className="bloom opacity-70"
        style={
          { '--bloom-x': '50%', '--bloom-y': '38%' } as React.CSSProperties
        }
      />

      <div className="mx-auto w-full max-w-xl">
        <Wordmark className="text-[22px]" />

        <p className="numeric mt-12 text-[13px] text-muted-foreground">404</p>
        <h1 className="display mt-4 text-[clamp(2.25rem,6vw,3.5rem)]">
          This page does not exist
        </h1>
        <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
          It moved, or it never existed. Neither is your fault — if you followed
          a link from our site, it is ours to fix.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="pill-cta pill-solid">
            Go to the home page
          </Link>
          <Link href="/contact" className="pill-cta pill-quiet">
            Tell us about it
          </Link>
        </div>
      </div>
    </main>
  );
}

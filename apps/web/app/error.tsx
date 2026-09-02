'use client';

import Link from 'next/link';

import { Wordmark } from '@/components/public/wordmark';

/**
 * 500.
 *
 * A client component because that is what Next requires of an error boundary
 * — it has to be able to re-render the segment via `reset()`.
 *
 * The digest is shown deliberately: it is the only handle a customer can
 * quote and we can search for, and on Vercel there is no SSH to go looking
 * without one (docs/RULES.md §5). It is an opaque hash, not a stack trace, so
 * showing it leaks nothing about the code.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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

        <p className="numeric mt-12 text-[13px] text-muted-foreground">500</p>
        <h1 className="display mt-4 text-[clamp(2.25rem,6vw,3.5rem)]">
          Something broke on our side
        </h1>
        <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
          This one is ours, not yours. Trying again often works — the fault is
          usually a moment rather than a state.
        </p>

        {error.digest ? (
          <p className="mt-6 text-[13px] text-muted-foreground">
            Quote this if you get in touch:{' '}
            <span className="numeric select-all">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="pill-cta pill-solid">
            Try again
          </button>
          <Link href="/" className="pill-cta pill-quiet">
            Go to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}

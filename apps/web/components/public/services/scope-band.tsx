import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';

import { ScopeArt } from './service-art';

const DEFAULT_TEXT =
  'Every engagement starts with a written scope: what gets built, what it costs, and when it lands.';

/**
 * The close of the services pages: how work is priced, and where to go next.
 * `text` is the services page's own second paragraph when the CMS has one.
 */
export function ScopeBand({ text }: { text?: string | null | undefined }) {
  return (
    <section className="relative mt-20 overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-card sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_65%)]"
      />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <ScopeArt className="size-16 flex-none text-foreground" />
          <div>
            <h2 className="headline text-[22px]">Scoped in writing first</h2>
            <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-muted-foreground">
              {(text ?? DEFAULT_TEXT).replace(/\s*\n\s*/g, ' ')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/plans"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-background px-5 text-[14px] font-medium ring-1 ring-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Layers className="size-4" aria-hidden="true" />
            See plans
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Start a project
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

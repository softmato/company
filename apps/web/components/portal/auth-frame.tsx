import Image from 'next/image';
import { FolderOpen, Globe, Route, type LucideIcon } from 'lucide-react';

import { Wordmark } from '@/components/public/wordmark';
import { SCENES } from '@/lib/portal/art';

const WHAT_IS_INSIDE: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: Route,
    title: 'Every stage, as it happens',
    line: 'Where your project stands and what comes next.',
  },
  {
    icon: Globe,
    title: 'Your site, live as it is built',
    line: 'Open it in a browser frame on desktop, tablet or phone.',
  },
  {
    icon: FolderOpen,
    title: 'Files, messages and invoices',
    line: 'One thread with the team, one place for every document.',
  },
];

/**
 * The frame around the portal's sign-in and invitation pages: the form on one
 * side, and on wide screens a green panel saying what is waiting inside.
 */
export function AuthFrame({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const scene = SCENES.webApps;

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section
        aria-label="What the client portal is for"
        className="relative isolate hidden overflow-hidden bg-[linear-gradient(150deg,#053d2e_0%,#047857_52%,#0f9f8a_100%)] px-12 py-14 text-white lg:flex lg:flex-col"
      >
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-emerald-300/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-teal-200/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.1] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]"
        />

        <Wordmark className="text-[22px] text-white" />
        <h2 className="display mt-10 max-w-[16ch] text-[40px]">
          Your project, out in the open.
        </h2>

        <ul className="mt-8 space-y-4">
          {WHAT_IS_INSIDE.map(({ icon: Icon, title: heading, line }) => (
            <li key={heading} className="flex gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/25"
              >
                <Icon className="size-5 text-emerald-100" />
              </span>
              <div>
                <p className="text-[15px] font-semibold">{heading}</p>
                <p className="text-sm text-emerald-50/80">{line}</p>
              </div>
            </li>
          ))}
        </ul>

        <Image
          src={scene.src}
          alt=""
          width={scene.width}
          height={scene.height}
          priority
          sizes="560px"
          className="mt-auto w-full max-w-[560px] self-center pt-10 drop-shadow-2xl"
        />
      </section>

      <div className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]"
        />

        <div className="relative w-full max-w-[25rem]">
          <div className="flex items-center justify-center gap-2.5">
            <Wordmark className="text-[20px]" />
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
              Client portal
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-7 shadow-float sm:px-7">
            <h1 className="headline text-[22px] leading-tight">{title}</h1>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {lead}
            </div>
            <div className="mt-6">{children}</div>
          </div>

          {footer ? (
            <div className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

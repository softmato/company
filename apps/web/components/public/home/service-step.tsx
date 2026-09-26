import Link from 'next/link';

import { MarkArrow } from '@/components/public/marks';

/**
 * One step in the services chapter: a heading, a line about it, three short
 * checked points, and a way in — simple enough to take in at a glance while
 * the picture beside it does the showing.
 *
 * Each step is 80vh on `lg`, the height of the sticky box beside them. The
 * picture sticks in the middle of the screen and swaps when a step's centre
 * crosses the middle; at matching heights the first step's copy is level with
 * the picture the moment it sticks, and the last one is level as it lets go.
 * Shorter steps also swap it twice on one flick of the wheel. That height is
 * the section's pacing, not padding.
 *
 * Dimmed until it is the current step. The film does the same thing and it is
 * what makes three headings in one column read as a sequence rather than as a
 * list: at any moment exactly one of them is being talked about.
 */
export function ServiceStep({
  index,
  active,
  title,
  summary,
  points,
  href,
  children,
}: {
  index: number;
  active: boolean;
  title: string;
  summary?: string | null;
  /** Three short lines, from `lib/home/service-art.ts`. */
  points?: readonly string[] | undefined;
  href: string;
  /** The still for this step. Shown inline below `lg`, where the sticky panel
   * beside the column does not exist. */
  children?: React.ReactNode;
}) {
  return (
    <div
      data-step={index}
      className="flex min-h-0 flex-col justify-center py-10 lg:min-h-[80vh]"
    >
      <div
        className={`transition-opacity duration-500 ease-out ${
          active ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <p className="numeric text-[11px] tracking-[0.2em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </p>

        <h3 className="headline mt-5 text-[clamp(1.6rem,3.4vw,2.5rem)] leading-[1.1]">
          {title}
        </h3>

        {summary ? (
          <p className="mt-4 max-w-[42ch] text-[15.5px] leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : null}

        {points ? (
          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 text-[15px] text-foreground"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-5 flex-none"
                  aria-hidden="true"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="10"
                    fill="color-mix(in oklab, var(--primary) 12%, transparent)"
                  />
                  <path
                    d="m6.2 10.3 2.6 2.6 5-5.3"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href={href}
          className="link-arrow mt-8 text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>What this involves</span>
          <MarkArrow className="size-5" />
        </Link>
      </div>

      {children ? <div className="mt-10 lg:hidden">{children}</div> : null}
    </div>
  );
}

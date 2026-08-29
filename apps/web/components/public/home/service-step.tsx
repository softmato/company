import Link from 'next/link';

import { MarkArrow } from '@/components/public/marks';

/**
 * One step in the services chapter: a heading, a line about it, and a way in.
 *
 * The steps are tall — a viewport-ish `min-height` each — because the panel
 * beside them only swaps when a step reaches the middle of the screen, and
 * steps shorter than that swap it twice on one flick of the wheel. That height
 * is the section's pacing, not padding.
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
  href,
  children,
}: {
  index: number;
  active: boolean;
  title: string;
  summary?: string | null;
  href: string;
  /** The still for this step. Shown inline below `lg`, where the sticky panel
   * beside the column does not exist. */
  children?: React.ReactNode;
}) {
  return (
    <div
      data-step={index}
      className="flex min-h-0 flex-col justify-center py-10 lg:min-h-[72vh]"
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

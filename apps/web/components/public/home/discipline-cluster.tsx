import Link from 'next/link';

import { Parallax } from '@/components/motion/parallax';
import { StaggerIn } from '@/components/motion/stagger-in';
import { RippleAsset } from '@/components/three/ripple-asset';
import { cn } from '@/lib/cn';
import { DISCIPLINES } from '@/lib/home/disciplines';

/**
 * The four disciplines, above the services steps — after the founder's
 * reference: each a light card with its title, caption and an arrow at the
 * bottom-left, and a rendered illustration inside it on the right. The
 * illustrations carry the colour (emerald, blue and near-black, the founder's
 * palette for this row); the cards stay quiet.
 *
 * Hovering an illustration stirs it like water (`RippleAsset`); hovering the
 * card lifts it and fills the arrow. The whole card is the link.
 *
 * Each card has its own `Parallax` speed, so the row separates into depth as
 * the section passes. A satellite chip hangs just below its card, inside the
 * same `Parallax`, so it moves with the card and can never drift onto the
 * headline or a neighbour (see `lib/home/disciplines.ts`). The row gap below
 * `lg` is wide enough for it.
 */
export function DisciplineCluster() {
  return (
    <StaggerIn
      as="ul"
      onScroll
      delay={0.1}
      className="mt-20 grid grid-cols-2 gap-x-3 gap-y-28 sm:gap-x-5 lg:grid-cols-4"
    >
      {DISCIPLINES.map((discipline) => (
        <li key={discipline.label}>
          <Parallax speed={discipline.parallax} className="relative">
            <Link href={discipline.href} className="discipline-card group">
              <RippleAsset
                src={discipline.asset.src}
                width={discipline.asset.width}
                height={discipline.asset.height}
                className="discipline-asset"
                style={
                  {
                    '--ar': discipline.asset.width / discipline.asset.height,
                  } as React.CSSProperties
                }
              />

              <span className="relative lg:max-w-[52%]">
                <span className="headline block text-[clamp(1.15rem,2.1vw,1.6rem)] leading-[1.12]">
                  {discipline.label}
                </span>
                <span className="mt-2 block text-[12.5px] leading-snug text-muted-foreground">
                  {discipline.caption}
                </span>
                <span className="discipline-arrow mt-4" aria-hidden="true">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </span>
            </Link>

            {discipline.satellite ? (
              <div
                className={cn(
                  'capability-sat pointer-events-none absolute top-full mt-3 w-[72%]',
                  discipline.satellite.side === 'right' ? 'right-0' : 'left-0',
                )}
              >
                <p className="text-[13px] font-medium leading-none">
                  {discipline.satellite.label}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {discipline.satellite.caption}
                </p>
              </div>
            ) : null}
          </Parallax>
        </li>
      ))}
    </StaggerIn>
  );
}

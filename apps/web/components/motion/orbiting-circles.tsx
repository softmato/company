import { Children, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Children spaced evenly round a ring, travelling it forever.
 *
 * Magic UI's `orbiting-circles`. Pure CSS — the `orbit` keyframe lives in
 * marketing.css as `.orbit` — so it composites and costs no JavaScript. The
 * transform at rest is the keyframe's first frame, so under reduced motion
 * (animation off) the icons still sit spaced round the ring rather than piling
 * up in the middle.
 *
 * Place inside a `relative` box; the ring centres on it.
 */
export function OrbitingCircles({
  children,
  className,
  reverse = false,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  duration?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
  speed?: number;
}) {
  const count = Children.count(children);

  return (
    <>
      {path && (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <circle
            /* `stroke-border` vanished on the tinted bento card. */
            className="stroke-foreground/20"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth={1.25}
          />
        </svg>
      )}
      {Children.map(children, (child, i) => (
        <div
          style={
            {
              '--duration': duration / speed,
              '--radius': radius,
              '--angle': (360 / count) * i,
              '--icon-size': `${iconSize}px`,
            } as React.CSSProperties
          }
          className={cn(
            'orbit absolute flex size-(--icon-size) items-center justify-center rounded-full',
            reverse && '[animation-direction:reverse]',
            className,
          )}
        >
          {child}
        </div>
      ))}
    </>
  );
}

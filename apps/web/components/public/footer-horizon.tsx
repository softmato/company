'use client';

import { EmeraldHorizon } from '@/components/three/emerald-horizon';
import { useNearViewport } from '@/components/three/use-near-viewport';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';

/**
 * The emerald horizon the page ends on: ThreeUI's Emerald Horizon at its
 * configured defaults, as the footer's background: pinned to its bottom edge
 * behind the content (`.stage` isolates the footer, so `-z-10` stays inside
 * it), on a transparent ground so the footer's own colour shows through.
 *
 * Mounted on approach (see `useNearViewport`): the footer is on every public
 * page, and a GL context booting during first paint is the stall the hero
 * spent a day getting rid of. Under reduced motion it holds one still frame.
 */
export function FooterHorizon() {
  const { ref, near } = useNearViewport<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[clamp(15rem,26vw,20rem)]"
    >
      {near ? (
        <EmeraldHorizon speed={prefersReducedMotion() ? 0 : 1} />
      ) : null}
    </div>
  );
}

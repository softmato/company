'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type RefObject } from 'react';

import { heroStart } from '@/components/public/home/hero-start';
import { HERO } from '@/components/public/home/hero-timing';
import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap } from '@/lib/motion/register';

/**
 * The header's arrival on the home page, after the hero's name and light.
 *
 * Children marked `data-enter="left" | "down" | "right"` slide in from that
 * side. Only on a first load of `/`: the header is in the layout and never
 * remounts, so a client-side navigation to home finds it already there, and
 * every other page gets it immediately. Played from the hero's own gate
 * (`heroStart`) on the hero's own clock (`HERO.header`), so it stays after the
 * wordmark however late the fonts land.
 *
 * Returns whether the entrance is still pending, which the header renders as
 * `data-entrance`. That attribute is in the server HTML, so marketing.css can
 * hide the three pieces from the very first paint — otherwise the header is
 * painted, vanishes when this hook sets the start state, and slides back in.
 * GSAP's inline `visibility` (via `autoAlpha`) overrides that rule while it
 * runs, and the attribute comes off when it lands.
 */
export function useHeaderEntrance(scope: RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const [onHomeAtLoad] = useState(pathname === '/');
  const [entering, setEntering] = useState(onHomeAtLoad);

  useEffect(() => {
    const el = scope.current;

    if (!el || !onHomeAtLoad || prefersReducedMotion()) return;

    const { at, duration, stagger } = HERO.header;

    /*
     * `heroStart` resolves after mount, possibly after this effect has been
     * torn down — always in development, where React mounts effects twice.
     * Playing a reverted timeline completes it instantly (its tweens are gone),
     * which fired `onComplete`, showed the header, and then the live timeline
     * slid it in a second time.
     */
    let live = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration, ease: 'expo.out' },
        onComplete: () => setEntering(false),
      });

      tl.fromTo('[data-enter="left"]', { x: -40, autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, at)
        .fromTo('[data-enter="down"]', { y: -32, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }, at + stagger)
        .fromTo('[data-enter="right"]', { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, at + stagger * 2);

      void heroStart().then(() => {
        if (live) tl.play();
      });
    }, el);

    return () => {
      live = false;
      ctx.revert();
    };
  }, [scope, onHomeAtLoad]);

  /* Once landed and the attribute is gone, leave nothing inline behind. */
  useEffect(() => {
    const el = scope.current;
    if (entering || !el) return;
    gsap.set(el.querySelectorAll('[data-enter]'), {
      clearProps: 'transform,opacity,visibility',
    });
  }, [entering, scope]);

  return entering;
}

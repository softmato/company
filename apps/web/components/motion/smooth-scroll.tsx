'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

import { prefersReducedMotion } from '@/lib/motion/reduced-motion';
import { gsap, registerMotionPlugins, ScrollTrigger } from '@/lib/motion/register';

/**
 * Smooth scrolling for the marketing surface.
 *
 * Lenis takes over the scroll and eases it, which is what makes the pinned and
 * scrubbed sections feel continuous rather than stepped. Two details matter:
 *
 *   1. **Lenis has to drive ScrollTrigger's clock.** Left alone the two keep
 *      separate ideas of the scroll position — Lenis animates towards a target
 *      while ScrollTrigger reads the browser's real, un-eased value — and
 *      every pinned section lags a frame behind the content. `scrollerProxy`
 *      is not needed because Lenis scrolls the window itself; telling
 *      ScrollTrigger to update on Lenis's tick is enough.
 *   2. **GSAP's ticker drives Lenis**, not `requestAnimationFrame`. Two
 *      independent rAF loops means two layout reads per frame and no ordering
 *      guarantee between them.
 *
 * Renders nothing. Mounted once from the public layout.
 */
export function SmoothScroll() {
  useEffect(() => {
    /*
     * Reduced motion gets the browser's own scrolling. Easing the page under
     * someone who asked for less movement is precisely the thing the setting
     * exists to prevent, and it makes the page feel unresponsive besides.
     */
    if (prefersReducedMotion()) return;

    registerMotionPlugins();

    const lenis = new Lenis({
      duration: 1.05,
      /* Exponential ease-out: quick to respond, long settle. */
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      /*
       * Touch scrolling is left to the OS. Smoothing it fights the platform's
       * own momentum and is the single most common way these pages end up
       * feeling broken on a phone.
       */
      syncTouch: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    /*
     * Re-measure Lenis whenever ScrollTrigger re-measures.
     *
     * Lenis clamps every wheel target to a cached `scrollHeight - innerHeight`.
     * Its own `ResizeObserver` keeps that cache honest — the root layout leaves
     * `<html>` free to grow so it can — but the observer is debounced 250ms and
     * knows nothing about the moments ScrollTrigger already treats as "the page
     * changed shape": load, resize, and the font-swap refresh below. Hooking
     * the two together means there is no window in which ScrollTrigger has the
     * new page height and Lenis is still clamping to the old one.
     */
    const syncSize = () => lenis.resize();

    ScrollTrigger.addEventListener('refresh', syncSize);

    const tick = (time: number) => lenis.raf(time * 1000);

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    /*
     * Re-measure once the webfonts have swapped in.
     *
     * ScrollTrigger caches every trigger's position the first time it runs.
     * The display face is a webfont, and when it arrives every heading on the
     * page changes height — which moves every trigger below it, while
     * ScrollTrigger goes on using the numbers it took from the fallback. The
     * symptom is a reveal that fires a few hundred pixels early near the foot
     * of a long page, and it is invisible on a warm cache, which is exactly
     * why it survives review.
     *
     * `document.fonts.ready` resolves immediately when the fonts are already
     * cached, so this costs a refresh that finds nothing on most visits.
     */
    let live = true;

    void document.fonts?.ready.then(() => {
      if (live) ScrollTrigger.refresh();
    });

    return () => {
      live = false;
      ScrollTrigger.removeEventListener('refresh', syncSize);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}

'use client';

import { useEffect, useId, useRef } from 'react';

import { registerMotionPlugins, ScrollTrigger } from '@/lib/motion/register';

/**
 * Tells the fixed site header that it is currently sitting over a dark
 * section, so it can re-tint itself.
 *
 * The public pages are light and three sections are not, and the header is
 * `fixed` — it is not a descendant of the section it overlaps, so no amount of
 * cascading from that section can reach it. Something has to carry the fact
 * across the gap.
 *
 * It does that with an attribute on `<html>` rather than by reaching into the
 * header's DOM. A component that queried `document.querySelector('header')`
 * would break silently the moment the header was wrapped in anything, and it
 * would hard-code the answer to "what should look different over a dark
 * ground" into the section that merely *is* dark. An attribute lets the
 * stylesheet decide (`html[data-nav='over-dark'] header` in marketing.css), and
 * lets any future dark section opt in by rendering this with no further
 * coupling.
 *
 * **Why this is a ScrollTrigger and not an IntersectionObserver.** The
 * condition being tested is `sectionTop <= headerStrip < sectionBottom`, and
 * that is not a thing an IntersectionObserver can express: its root margins are
 * a single box, so a one-pixel sentinel at the section's bottom edge reports
 * "not intersecting" both when the section has scrolled past *and* when the
 * section is simply taller than the viewport and its bottom has not arrived
 * yet. The original version was exactly that sentinel, and it was correct for
 * as long as the only dark section was the hero — a hero is one viewport tall,
 * so its bottom edge is never far off screen. The products band is 1400px tall,
 * and over it the header went back to its light styling: near-black wordmark on
 * a near-black ground. `start`/`end` express the range directly, and Lenis
 * already drives ScrollTrigger's clock, so this reads no layout of its own.
 *
 * **Counted, not written directly.** Each zone registers itself in a shared set
 * while it covers the header, and the attribute is derived from whether that
 * set is empty. Three components each assigning `dataset.nav` is a race — they
 * all resolve on mount, the two off screen report false, and whichever lands
 * last decides, which on a first paint at the top of the page is a coin flip
 * between a legible wordmark and an empty pill.
 *
 * The trigger is the parent element, so this stays a component a dark section
 * drops in rather than one it has to wire a ref to. The parent must be the
 * section itself; `.stage` is.
 */

/** Height of the strip the fixed header occupies, including its top inset. */
const HEADER_STRIP = 84;

/** The dark zones currently under the header. Module scope: one per document. */
const covering = new Set<string>();

function sync() {
  document.documentElement.dataset.nav =
    covering.size > 0 ? 'over-dark' : 'over-light';
}

export function DarkNavZone() {
  const anchor = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const section = anchor.current?.parentElement;

    if (!section) return;

    registerMotionPlugins();

    /*
     * No `prefers-reduced-motion` bail-out here, unlike every other module that
     * touches GSAP. This is not an animation — it is which of two colour
     * schemes the header is legible against, and a reader who asked for less
     * movement still needs to be able to read the logo.
     */
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: `top ${HEADER_STRIP}px`,
      end: `bottom ${HEADER_STRIP}px`,
      onToggle: (self) => {
        if (self.isActive) covering.add(id);
        else covering.delete(id);

        sync();
      },
    });

    /* Set the initial state; `onToggle` only fires on a change. */
    if (trigger.isActive) covering.add(id);
    sync();

    return () => {
      trigger.kill();
      covering.delete(id);

      /*
       * Navigating away tears every zone down at once. Clear the attribute once
       * the last one has gone, rather than leaving a stale `over-dark` to put
       * every other page's header in white text on a white ground.
       */
      if (covering.size === 0) delete document.documentElement.dataset.nav;
      else sync();
    };
  }, [id]);

  return <div ref={anchor} aria-hidden="true" className="hidden" />;
}

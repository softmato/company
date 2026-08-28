'use client';

import { useEffect, useRef } from 'react';

/**
 * Tells the fixed site header that it is currently sitting over a dark
 * section, so it can re-tint itself.
 *
 * The public pages are light and the hero band is not, and the header is
 * `fixed` — it is not a descendant of the section it overlaps, so no amount of
 * cascading from the hero can reach it. Something has to carry the fact across
 * the gap.
 *
 * It does that with an attribute on `<html>` rather than by reaching into the
 * header's DOM. A component that queried `document.querySelector('header')`
 * would break silently the moment the header was wrapped in anything, and it
 * would hard-code the answer to "what should look different over a dark
 * ground" into the section that merely *is* dark. An attribute lets the
 * stylesheet decide, and lets any future dark section opt in by rendering this
 * with no further coupling.
 *
 * The mechanism is a one-pixel sentinel pinned to the bottom of the parent
 * section and an observer whose root is the viewport minus the strip the
 * header occupies. While the sentinel is inside that root, the section's
 * bottom edge is still below the header, so the header is over dark. The
 * alternative — observing the section itself and computing rootMargins from
 * `window.innerHeight` — has to be recomputed on every resize and on mobile
 * URL-bar collapse; a sentinel needs neither.
 *
 * The parent must be positioned. `.stage` is.
 */

/** Height of the strip the fixed header occupies, including its top inset. */
const HEADER_STRIP = 84;

export function DarkNavZone() {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;

    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.documentElement.dataset.nav = entry?.isIntersecting
          ? 'over-dark'
          : 'over-light';
      },
      { rootMargin: `-${HEADER_STRIP}px 0px 0px 0px`, threshold: 0 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      /*
       * Clear on unmount, not just disconnect. Navigating away from the home
       * page tears this down without the observer ever firing again, and a
       * stale `over-dark` would leave every other page's header in white text
       * on a white ground.
       */
      delete document.documentElement.dataset.nav;
    };
  }, []);

  return (
    <div
      ref={sentinel}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
    />
  );
}

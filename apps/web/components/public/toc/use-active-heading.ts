'use client';

import { useEffect, useState } from 'react';

import type { Heading } from '@/lib/cms/headings';

/**
 * The line, in pixels down the viewport, that decides which section the reader
 * is in. A heading that has crossed it is the one being read.
 *
 * It sits below the floating header, and above the `scroll-mt` a markdown
 * heading carries, so a section arrived at from a `#hash` link is immediately
 * the current one rather than one pixel short of it.
 */
const READING_LINE = 120;

/** The last heading to have crossed the line — or the first, above them all. */
function headingAtLine(elements: HTMLElement[]): string | undefined {
  let current = elements[0]?.id;

  for (const element of elements) {
    if (element.getBoundingClientRect().top > READING_LINE) break;
    current = element.id;
  }

  return current;
}

/**
 * Which section of the document the reader is currently in.
 *
 * Position, not intersection. An `IntersectionObserver` is the cheaper
 * instinct here and it was the first attempt, but it answers "is a heading
 * inside this strip of the viewport", and a section longer than the strip
 * leaves the strip empty — so a reader who lands mid-document from a link, or
 * a restored scroll position, gets a rail with nothing lit at all. Comparing
 * every heading against one line always has an answer.
 *
 * The read is throttled to a frame and takes no locks on layout: a dozen
 * `getBoundingClientRect` calls in one pass, all reads and no writes, is a
 * single cached layout even while Lenis is easing the scroll.
 */
export function useActiveHeading(headings: Heading[]): string | undefined {
  const [active, setActive] = useState<string>();

  // The ids, as one string, so the effect re-runs when the document changes
  // but not when the parent re-renders with an equal array.
  const key = headings.map((heading) => heading.id).join('|');

  useEffect(() => {
    const elements = (key ? key.split('|') : [])
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      setActive(headingAtLine(elements));
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    /*
     * The first reading is scheduled rather than taken here: the browser has
     * not necessarily finished jumping to a `#hash` at the moment this effect
     * runs, and a frame's delay costs nothing on a rail nobody has looked at
     * yet.
     */
    schedule();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [key]);

  return active;
}

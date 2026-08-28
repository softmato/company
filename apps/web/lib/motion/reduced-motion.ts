/**
 * The one place that answers "should this move?".
 *
 * Every motion component checks this before building a timeline and bails out
 * entirely rather than animating faster. The CSS in marketing.css handles the
 * same setting for anything already painted, but a GSAP timeline is built in
 * JS and would otherwise still run — `prefers-reduced-motion` is a request not
 * to animate, not a request to animate briefly.
 *
 * Returns false during SSR, where there is no media query to read and nothing
 * is animating yet anyway.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

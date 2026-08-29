/**
 * The constellation under the opening statement.
 *
 * This is the film's scattered stat-bubble arrangement with the statistics
 * taken out of it. The film rings its heading with "5+ years", "800 schools",
 * "15K educators" — every one of which is a claim about the business, and
 * nothing on this site states one the founder has not given. What the bubbles
 * are actually doing is typographic: short words floating in soft circles at
 * heights their neighbours do not share, so the eye wanders instead of reading
 * a row.
 *
 * **The labels are the services offered after launch, and nothing else.** Three
 * drafts got the category wrong before this one. Web / Apps / Payments / Books
 * was the catalogue, which the services chapter now carries in its discipline
 * cluster — the same four nouns twice on one page is the page repeating itself.
 * Written down / Audited / Handed over was a values slide: nothing a reader
 * could picture or ask for by name. Integrations / Reconciliation / Audit
 * trails named real things, but they are *features of a build*, and this
 * section is not about the build.
 *
 * The heading above these reads "We stay on the software we build, long after
 * it ships", and the discs have to be the evidence for that sentence. So the
 * category is fixed: what a company keeps doing for a product once the product
 * exists. The CMS already answers it, on the products page, in one line — "We
 * are the ones who host it, patch it, and answer when it breaks" — which is
 * three of the four. The fourth is the change work that keeps arriving on a
 * live system, which the tier copy covers.
 *
 * The largest disc gets Support on purpose. It is the claim in the headline,
 * and the biggest circle is the one the eye lands on first.
 *
 * `offset` is the share of the disc's own height it is pushed down by, which is
 * what makes the arrangement a scatter rather than a line. `scale` varies the
 * diameter so they are not all the same size either.
 */
export interface CraftDisc {
  label: string;
  caption: string;
  /** 0 sits on the baseline; 0.5 drops the disc half its own height. */
  offset: number;
  /** Relative diameter, 1 being the grid's natural cell. */
  scale: number;
  /** Float travel in pixels. See `components/motion/drift.tsx`. */
  drift: number;
  /** Seconds for half a float cycle. */
  period: number;
  /** Scroll-linked travel, as a fraction of viewport height. See `Parallax`. */
  parallax: number;
}

/**
 * Three numbers per disc decide how it moves, and all three are deliberately
 * unequal across the set.
 *
 * `parallax` is the depth cue and the only one tied to the scroll: a disc at
 * 0.14 climbs roughly twice as far up the page as one at 0.07, so by the time
 * the section has crossed the viewport the four have visibly re-arranged
 * themselves. `drift` and `period` are the idle float on top of that, and no
 * period is a multiple of another so the four pull apart in the first cycle and
 * never resynchronise. In time is a carousel; out of time is a scatter that
 * happens to be alive.
 *
 * Bigger discs move less and slower on both axes. A large object drifting as
 * fast as a small one reads as weightless, and the size difference is only
 * worth having if it reads as weight.
 */
export const CRAFT_DISCS: CraftDisc[] = [
  {
    label: 'Hosting',
    caption: 'Servers, domains, certificates',
    offset: 0.1,
    scale: 1,
    drift: 12,
    period: 6.4,
    parallax: 0.11,
  },
  {
    label: 'Patching',
    caption: 'Updates and security fixes',
    offset: 0.52,
    scale: 0.92,
    drift: 15,
    period: 5.3,
    parallax: 0.15,
  },
  {
    label: 'Support',
    caption: 'We answer when it breaks',
    offset: 0,
    scale: 1.14,
    drift: 9,
    period: 7.9,
    parallax: 0.06,
  },
  {
    label: 'Changes',
    caption: 'New work on software already live',
    offset: 0.44,
    scale: 0.98,
    drift: 13,
    period: 6.9,
    parallax: 0.13,
  },
];

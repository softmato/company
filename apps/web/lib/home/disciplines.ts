/**
 * The discipline cluster in the services chapter.
 *
 * The chapter's steps come from the CMS and are the long answer — one heading,
 * one paragraph and a link each, read one at a time as the reader scrolls. This
 * is the short answer, above them: four words for the four kinds of work, all
 * visible at once, for the reader who wants to know whether they are in the
 * right place before committing to a scroll.
 *
 * These are capabilities, not claims — no counts, no years, no clients. See
 * `lib/home/statements.ts` for why that line matters and where it is drawn.
 *
 * **Satellites.** Two of the four carry a small box tucked over one edge,
 * naming a thing the discipline above it actually has to do. They exist for a
 * compositional reason as much as an editorial one: four equal boxes in a row
 * is a grid, and a grid is the layout this page spends the rest of its length
 * avoiding. A small box crossing the seam between two larger ones breaks the
 * row into something with a front and a back — which is the whole point, since
 * the satellite parallaxes at its own speed and visibly slides across its
 * neighbour as the section passes.
 *
 * `parallax` is a fraction of viewport height, scrubbed. Neighbouring values
 * are deliberately unequal; if they matched, the cluster would translate as one
 * block and read as a rendering offset rather than as depth.
 */
export interface Satellite {
  label: string;
  caption: string;
  /**
   * Which edge of the host box it hangs over. Both satellites point *inward*
   * from their host, never off the outside of the cluster — a box hanging past
   * the last column is a box that gets clipped by `.stage` on a narrow screen.
   */
  side: 'left' | 'right';
  /**
   * Vertical placement within the host, as a percentage of its height.
   *
   * Keep it in the host's *upper* half. Both `.capability` boxes bottom-align
   * their own label and caption, so the top of a box is the empty part and the
   * bottom is the part with words in it — a satellite at 58% sat squarely on
   * the neighbour's title.
   */
  top: string;
  /**
   * How far past the host's edge it hangs, as a percentage of the host's width.
   *
   * This needs to be most of the satellite's own width. The host's caption sits
   * in the bottom-left of the box, so a satellite that only just clears the
   * edge covers the words it is supposed to be sitting beside — which is what
   * the first pass did. Keep enough of the box outside the host that what
   * remains inside is the corner, not the copy.
   */
  overhang: string;
  parallax: number;
}

export interface Discipline {
  label: string;
  caption: string;
  parallax: number;
  satellite?: Satellite;
}

export const DISCIPLINES: Discipline[] = [
  {
    label: 'Web',
    caption: 'Sites and web applications',
    parallax: 0.12,
    satellite: {
      label: 'Payments',
      caption: 'eSewa, Khalti, Fonepay, bank QR',
      side: 'right',
      top: '14%',
      overhang: '-46%',
      parallax: 0.04,
    },
  },
  {
    label: 'Apps',
    caption: 'One codebase, both stores',
    parallax: 0.06,
  },
  {
    label: 'UI/UX',
    caption: 'Interfaces and the flows through them',
    parallax: 0.14,
  },
  {
    label: 'Software design',
    caption: 'How the parts fit before any of it is written',
    parallax: 0.08,
    satellite: {
      label: 'Books',
      caption: 'Double-entry, not a spreadsheet',
      side: 'left',
      top: '8%',
      overhang: '-46%',
      parallax: 0.17,
    },
  },
];

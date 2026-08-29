/**
 * The craft constellation under the opening statement.
 *
 * This is the film's scattered stat-bubble arrangement with the statistics
 * taken out of it. The film rings its heading with "5+ years", "800 schools",
 * "15K educators" — every one of which is a claim about the business, and
 * nothing on this site states one the founder has not given. What the bubbles
 * are actually doing is typographic: short words floating in soft circles at
 * heights their neighbours do not share, so the eye wanders instead of reading
 * a row. A craft name does that job and is true today.
 *
 * `offset` is the share of the disc's own height it is pushed down by, which is
 * what makes the arrangement a scatter rather than a line. `span` widens a disc
 * on the grid so they are not all the same size either.
 */
export interface CraftDisc {
  label: string;
  caption: string;
  /** 0 sits on the baseline; 0.5 drops the disc half its own height. */
  offset: number;
  /** Relative diameter, 1 being the grid's natural cell. */
  scale: number;
}

export const CRAFT_DISCS: CraftDisc[] = [
  {
    label: 'Web',
    caption: 'Sites and web applications',
    offset: 0.1,
    scale: 1,
  },
  {
    label: 'Apps',
    caption: 'One codebase, both stores',
    offset: 0.52,
    scale: 0.92,
  },
  {
    label: 'Payments',
    caption: 'eSewa, Khalti, Fonepay, bank QR',
    offset: 0,
    scale: 1.14,
  },
  {
    label: 'Books',
    caption: 'Double-entry, not a spreadsheet',
    offset: 0.44,
    scale: 0.98,
  },
];

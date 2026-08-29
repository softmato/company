/**
 * The words that fall into a pile in the principles section, and where they
 * come to rest when nothing falls.
 *
 * The reference film drops fifteen coloured pills into the bottom of its
 * "Benefits" chapter under gravity and lets them settle in whatever heap they
 * land in. It works because a heap is *not a list*: nothing is first, nothing
 * is ranked, and the reader takes the shape of it rather than reading fifteen
 * items. A tidy grid of the same fifteen words would be read, compared, and
 * found to be marketing.
 *
 * Ours are things a client can check after the handover rather than claims that
 * need evidence — "documented" is verifiable on delivery day, "trusted by
 * hundreds" is not. See the standing rule about figures in
 * `docs/reference/README.md`.
 *
 * **`x`, `y` and `r` are the settled layout, not a starting position.** They are
 * what the pile looks like with no JavaScript, with a failed bundle, and under
 * `prefers-reduced-motion` — the same heap, already at rest. `PillPile` takes
 * over from there when it loads. Authored by hand rather than generated: a heap
 * has to look dropped, and a seeded random one looks scattered, which is a
 * different thing.
 *
 * `tone` picks one of three fills. Roughly a third emerald keeps the pile from
 * becoming a green blob; the film's ratio of accent to neutral is about the
 * same and that is not an accident.
 */
export interface Quality {
  label: string;
  tone: 'solid' | 'ink' | 'quiet';
  /** Resting centre, as a percentage of the pile box. */
  x: number;
  y: number;
  /** Resting rotation in degrees. */
  r: number;
}

export const QUALITIES: Quality[] = [
  { label: 'Documented', tone: 'quiet', x: 13, y: 90, r: -4 },
  { label: 'Yours to host', tone: 'solid', x: 32, y: 91, r: 3 },
  { label: 'Tested', tone: 'quiet', x: 50, y: 90, r: -2 },
  { label: 'Source handed over', tone: 'ink', x: 70, y: 91, r: 5 },
  { label: 'Backed up', tone: 'quiet', x: 89, y: 89, r: -6 },

  { label: 'Fast on a phone', tone: 'solid', x: 20, y: 74, r: 6 },
  { label: 'Accessible', tone: 'quiet', x: 41, y: 75, r: -3 },
  { label: 'Nepali dates', tone: 'quiet', x: 60, y: 74, r: 4 },
  { label: 'No lock-in', tone: 'ink', x: 80, y: 75, r: -5 },

  { label: 'Auditable', tone: 'quiet', x: 29, y: 58, r: -7 },
  { label: 'Boring stack', tone: 'solid', x: 50, y: 59, r: 2 },
  { label: 'Offline-tolerant', tone: 'quiet', x: 71, y: 58, r: 7 },

  { label: 'Answered directly', tone: 'ink', x: 39, y: 43, r: 4 },
  { label: 'Handed over working', tone: 'solid', x: 62, y: 42, r: -4 },
];

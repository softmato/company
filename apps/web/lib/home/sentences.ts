import type { ToneSentence } from './tone';

/**
 * The two-tone headlines, one per section.
 *
 * Kept together rather than beside each component so the page's voice can be
 * read in one screen — six headlines written six days apart drift, and the
 * drift is only visible when they are next to each other.
 *
 * Every one paraphrases copy that is already in the CMS and editable by a
 * founder (`packages/db/seed/marketing/`). None states a fact that would need
 * checking: no headcount, no founding year, no customer counts, no prices.
 * That constraint is why this file is short.
 *
 * On the alternation itself: the dim words are the connective tissue — "that",
 * "for", "the", "we" — and the full-contrast words are the ones that carry the
 * sentence. Read the full-tone words alone and the headline should still say
 * something. That is the test; it is not decoration applied to every other
 * word.
 */

/** The opening statement, under the hero. */
export const STATEMENT: ToneSentence = [
  { text: 'We build software' },
  { text: 'we would be willing to', tone: 'dim' },
  { text: 'run ourselves' },
  { text: '— and then we run it.', tone: 'dim' },
];

/** The services chapter. */
export const SERVICES_HEADING: ToneSentence = [
  { text: 'Three kinds of work,' },
  { text: 'and the same', tone: 'dim' },
  { text: 'standard' },
  { text: 'under all of them.', tone: 'dim' },
];

/** The products chapter, on the dark band. */
export const PRODUCTS_HEADING: ToneSentence = [
  { text: 'We run' },
  { text: 'what we', tone: 'dim' },
  { text: 'build.' },
];

/** The scope ladder. */
export const TIERS_HEADING: ToneSentence = [
  { text: 'Every project' },
  { text: 'lands on one of', tone: 'dim' },
  { text: 'three rungs.' },
];

/** The principles chapter, over the pile. */
export const PRINCIPLES_HEADING: ToneSentence = [
  { text: 'Software that is' },
  { text: 'right,' },
  { text: 'not software that', tone: 'dim' },
  { text: 'looks right.' },
];

/** The closing question, on the dark band. */
export const CLOSING_HEADING: ToneSentence = [
  { text: 'Have something' },
  { text: 'that needs', tone: 'dim' },
  { text: 'building properly?' },
];

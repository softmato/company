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

/**
 * The opening statement, under the hero.
 *
 * An earlier draft read "We build software we would be willing to run
 * ourselves — and then we run it." Two things were wrong with it. "Willing to"
 * is a hedge, and a hedge in the largest type on the page is the one word the
 * reader remembers. And "we build software", unqualified, is a claim to build
 * anything, which is a promise nobody should make in a headline. This one
 * claims a duration instead of a capability: we are still here afterwards.
 */
export const STATEMENT: ToneSentence = [
  { text: 'We' },
  { text: 'stay', mark: 'fill' },
  { text: 'on the software' },
  { text: 'we build,', tone: 'dim' },
  { text: 'long after it ships.' },
];

/**
 * The services chapter.
 *
 * It used to open "Three kinds of work". The chapter's steps come from the CMS
 * and the discipline cluster above them names four, so the headline was a count
 * that the section under it contradicted — and it would have gone wrong again
 * the first time a founder published a fifth service. A headline should not
 * have to be edited because a row was added to a table.
 */
export const SERVICES_HEADING: ToneSentence = [
  { text: 'The work changes,' },
  { text: 'the', tone: 'dim' },
  { text: 'standard does not.' },
];

/**
 * The payments diagram. Describes what the system already does after a wallet
 * settles — receipt, ledger entry, webhook — and names no count of wallets, so
 * adding a fourth provider does not make it wrong.
 */
export const PAYMENTS_HEADING: ToneSentence = [
  { text: 'The payment lands,' },
  { text: 'and the', tone: 'dim' },
  { text: 'paperwork follows.' },
];

/** The scope ladder. */
export const TIERS_HEADING: ToneSentence = [
  { text: 'Every project' },
  { text: 'lands on one of', tone: 'dim' },
  { text: 'three rungs.' },
];

/** The principles chapter, over the route diagram. */
export const PRINCIPLES_HEADING: ToneSentence = [
  { text: 'Software that is' },
  { text: 'right,', mark: 'underline' },
  { text: 'not software that', tone: 'dim' },
  { text: 'looks right.' },
];

/** The close, over the wall of names. */
export const TRUSTED_HEADING: ToneSentence = [
  { text: 'Trusted by the teams' },
  { text: 'that run on what we build.', tone: 'dim' },
];

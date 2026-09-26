/**
 * The home page's short statements.
 *
 * The marketing surface is built around single lines set very large — the
 * reference's "Fast. Reliable. Safe." — and a line like that cannot come from
 * a markdown body, because there is no field in the CMS whose contract is
 * "three words". So they live here, in one small module, rather than being
 * typed into six different components.
 *
 * **Every line below paraphrases copy that is already in the CMS**, drafted in
 * `packages/db/seed/marketing/pages.ts` and editable by a founder. None of
 * them states a fact that would need checking: no headcount, no founding year,
 * no customer counts, no prices. That constraint is deliberate and it is the
 * reason this file is short — the moment a line here needs evidence it belongs
 * in a CMS field with a founder's name on it, not in the bundle.
 *
 * If the seeded copy changes, change these with it. They are a summary of it,
 * and a summary that no longer matches its source is just a second opinion.
 */

/** Under the hero. Paraphrases the home page's "How we work" section. */
export const CRAFT_STATEMENT = [
  'We build it.',
  'We run it.',
  'We answer for it.',
];

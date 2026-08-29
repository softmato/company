/**
 * Whether a legal document is actually fit to be read as policy.
 *
 * Pure — no database, no `server-only`, no aliases — so the same function runs
 * in `scripts/check-legal.mts` before a deploy and in the public page that
 * decides whether a crawler may index it. One definition, because two would
 * eventually disagree, and the disagreement would surface as a policy full of
 * placeholders sitting in Google's index.
 *
 * The two signals come from the seeds (packages/db/seed/legal/shared.ts):
 * `[confirm: …]` marks a fact only the founder knows, and the draft banner is
 * the notice that stays until a human removes it deliberately.
 */

/** Markers left in the seeded text for facts nobody has confirmed. */
const CONFIRM_MARKER = /\[confirm:/g;

/** The first line of every seeded document, until someone deletes it. */
const DRAFT_BANNER = 'Draft — not yet reviewed';

export interface LegalReadiness {
  ready: boolean;
  /** How many `[confirm: …]` markers are still in the body. */
  unconfirmed: number;
  /** Whether the "not yet reviewed" banner is still at the top. */
  draftBanner: boolean;
}

export function legalReadiness(body: string): LegalReadiness {
  const unconfirmed = (body.match(CONFIRM_MARKER) ?? []).length;
  const draftBanner = body.includes(DRAFT_BANNER);

  return { ready: unconfirmed === 0 && !draftBanner, unconfirmed, draftBanner };
}

/**
 * The question the SEO layer asks.
 *
 * A document can be `status = 'published'` — reachable, linked from the
 * footer, rendering fine — and still not be something we want a search engine
 * to keep a copy of. Publishing is the founder's call; indexing an unfinished
 * policy is a separate and much harder thing to undo, because the placeholder
 * text keeps appearing in results long after the page is fixed.
 */
export function isIndexableLegalDocument(body: string): boolean {
  return legalReadiness(body).ready;
}

/**
 * Shared scaffolding for the legal document seeds.
 *
 * Every document here is a **draft written for a Nepali software company**,
 * not advice and not a reviewed policy. They exist so the founder edits real
 * text in the admin panel instead of starting from a blank box, and so the
 * public pages have something of the right shape to render.
 *
 * Three rules hold for all of them:
 *
 *   1. They are seeded `draft`, with no `effectiveAt`. The database refuses to
 *      publish a legal document without an effective date, which is the
 *      behaviour we want — a policy nobody can date is not evidence of what a
 *      customer agreed to.
 *   2. Facts nobody has confirmed appear as `[confirm: …]`. They are greppable
 *      on purpose. Nothing should be published while one is still in the text.
 *   3. Nepali law is cited by name and year because the reader is in Nepal and
 *      a policy that cites the GDPR would be theatre.
 */
import type { legalDocuments } from '../../schema/cms';

export type LegalDocumentSeed = typeof legalDocuments.$inferInsert;

/**
 * Sits at the top of every seeded body.
 *
 * It stays there until a human removes it deliberately, so a document that
 * reaches a reader while still unreviewed says so in its first line rather
 * than passing as settled policy.
 */
export const DRAFT_NOTICE = `> **Draft — not yet reviewed.** This text was written as a starting point for
> a Nepali software company and has not been checked by a lawyer. Every
> \`[confirm: …]\` marker is a fact only the founder knows. Fill those in, have
> the document reviewed, set an effective date, and only then publish it.`;

/** Legal name is not final (docs/MEMORY.md). */
export const COMPANY = 'Softmato Technology Pvt Ltd';

export const CONTACT_BLOCK = `**${COMPANY}**
[confirm: registered office address]
PAN: [confirm: PAN number]
Company registration: [confirm: registration number, Office of the Company Registrar]
Email: [confirm: contact email]
Phone: [confirm: phone number]`;

/** Assembles a document body with the notice first and the contact last. */
export function body(...sections: string[]): string {
  return [DRAFT_NOTICE, ...sections].join('\n\n');
}

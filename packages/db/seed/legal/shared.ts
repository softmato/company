/**
 * Shared scaffolding for the legal document seeds.
 *
 * Every document here was **written for a Nepali software company** and is not
 * legal advice. They exist so the founder edits real text in the admin panel
 * instead of starting from a blank box, and so the public pages have something
 * of the right shape to render.
 *
 * Three rules hold for all of them:
 *
 *   1. They are seeded `draft`, with no `effectiveAt`. The database refuses to
 *      publish a legal document without an effective date, which is the
 *      behaviour we want — a policy nobody can date is not evidence of what a
 *      customer agreed to. Publishing is a separate, deliberate act:
 *      `pnpm legal:refresh --publish` or the admin panel.
 *   2. Facts about the company are `{{settings.key}}` tokens, resolved when the
 *      page renders from whatever the founder has saved in the admin panel.
 *      See `apps/web/lib/cms/tokens.ts`. A blank required setting resolves to
 *      `[confirm: …]`, which still blocks publication — so nothing here can go
 *      live with a hole in it, and nothing has to be edited twice when the
 *      office moves.
 *   3. Nepali law is cited by name and year because the reader is in Nepal and
 *      a policy that cites the GDPR would be theatre.
 */
import type { legalDocuments } from '../../schema/cms';

export type LegalDocumentSeed = typeof legalDocuments.$inferInsert;

/**
 * The company's own name, as a token.
 *
 * Not a constant any more: the legal name is not final (docs/MEMORY.md), and
 * the one place it is allowed to live is `company.legal_name` in the settings
 * table. A hardcoded name here would have to be changed in a deploy on the day
 * the registrar's certificate says something else.
 */
export const COMPANY = '{{company.legal_name}}';

/**
 * The block at the foot of every policy.
 *
 * **Name, address, email — and deliberately nothing else.** Nepal has no
 * Impressum rule obliging a company to print its PAN, registry number or phone
 * on a website, and the founder's call is to publish none of them (session 11).
 *
 * Note *why* they are absent from this string rather than simply left blank in
 * the settings table: `company.pan` is required on every tax invoice and
 * `company.phone` is printed on the contact page and on invoices, so both must
 * stay populated. Achieving "not on the policies" by emptying the setting would
 * have stripped the PAN off the invoices too. Where a value is wanted in one
 * place and not another, the omission belongs in the document, not in the data.
 *
 * All three that remain are **required**: a policy that does not identify the
 * entity behind it is a weaker contract, and the Individual Privacy Act, 2075
 * gives people rights they need a route to exercise.
 */
export const CONTACT_BLOCK = `**{{company.legal_name}}**
{{company.address}}
Email: {{company.contact_email}}`;

/**
 * Assembles a document body.
 *
 * These bodies once opened with a "Draft — not yet reviewed" banner, removed on
 * the founder's instruction (session 12) once the company details were saved
 * and the documents were taken as settled. The **check** that banner fed has
 * deliberately not been removed: `legalReadiness()` still refuses to index any
 * document containing that phrase, so writing it back into one — here or in the
 * admin panel — pulls the page out of the sitemap again.
 */
export function body(...sections: string[]): string {
  return sections.join('\n\n');
}

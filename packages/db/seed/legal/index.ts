/**
 * The eight legal documents, one file each (see ./shared.ts for the rules they
 * all follow).
 *
 * The order of this array is the order they are seeded in and nothing else.
 * It is **not** the order the footer shows: `listPublishedLegalDocuments()`
 * sorts by slug, so the footer reads aup, candidates, cookies, partner-terms,
 * privacy, refunds, sla, terms regardless of what is written here. Change the sort in
 * `apps/web/lib/cms/public-queries.ts` if that order should be editorial
 * rather than alphabetical.
 */
import { aup } from './aup';
import { candidates } from './candidates';
import { cookies } from './cookies';
import { partnerTerms } from './partner-terms';
import { privacy } from './privacy';
import { refunds } from './refunds';
import { sla } from './sla';
import { terms } from './terms';
import type { LegalDocumentSeed } from './shared';

export type { LegalDocumentSeed };

export const legalDocumentSeeds: LegalDocumentSeed[] = [
  terms,
  privacy,
  refunds,
  sla,
  aup,
  cookies,
  candidates,
  partnerTerms,
];

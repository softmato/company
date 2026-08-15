/**
 * The six legal documents, one file each (see ./shared.ts for the rules they
 * all follow).
 *
 * Order matters only in the footer, where they are listed as they come back
 * from the database; keep the most-read first.
 */
import { aup } from './aup';
import { cookies } from './cookies';
import { privacy } from './privacy';
import { refunds } from './refunds';
import { sla } from './sla';
import { terms } from './terms';
import type { LegalDocumentSeed } from './shared';

export type { LegalDocumentSeed };
export { DRAFT_NOTICE } from './shared';

export const legalDocumentSeeds: LegalDocumentSeed[] = [
  terms,
  privacy,
  refunds,
  sla,
  aup,
  cookies,
];

/**
 * CMS seed content.
 *
 * **Everything is seeded as `draft` and nothing is ever published by the
 * seeder.** A founder reads it, edits it, and publishes it — putting words on
 * the internet is not a thing a seed script should be able to do.
 *
 * Where the content lives:
 *
 *   - `./marketing/` — pages, services, product pages, blog. Real draft copy,
 *     written from docs/PRD.md and the code that exists.
 *   - `./legal/` — the six policies. Real drafts, unreviewed, each carrying a
 *     notice that says so.
 *   - here — team members only, because a person's name cannot be drafted from
 *     a document. They stay obviously fictional until the founder replaces
 *     them, and their photos are left empty deliberately: those are uploaded
 *     from the admin panel.
 *
 * Idempotent: conflicts on the natural key do nothing, so a founder's edits
 * are never overwritten by a re-run. See ./index.ts for the one exception —
 * text still holding the old placeholder marker is upgraded in place.
 */
import type { teamMembers } from '../schema/cms';

type TeamMemberSeed = typeof teamMembers.$inferInsert;

export {
  pageSeeds,
  serviceSeeds,
  productPageSeeds,
  blogPostSeeds,
} from './marketing';

export { legalDocumentSeeds } from './legal';

export const teamMemberSeeds: TeamMemberSeed[] = [
  {
    name: 'Placeholder Person',
    role: 'Founder',
    bio: 'Fictional. Replace with a real team member — open question 8.',
    sortOrder: 1,
  },
  {
    name: 'Second Placeholder',
    role: 'Founder',
    bio: 'Fictional. Replace with a real team member — open question 8.',
    sortOrder: 2,
  },
];

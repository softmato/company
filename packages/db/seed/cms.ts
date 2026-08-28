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

/**
 * The two founders, named by the founder on 2026-08-28. These replace the
 * fictional placeholders that stood here while open question 8 was unanswered.
 *
 * The bios describe what each person is responsible for and nothing else. No
 * years, no previous employers, no qualifications — none of that was given,
 * and a biography is the easiest place on a website to state something nobody
 * checked. Photographs are deliberately absent: `photoUrl` stays null and the
 * team grid renders an initials tile, which says "no photograph yet" and is
 * true. A stock portrait under a real colleague's name is not.
 */
export const teamMemberSeeds: TeamMemberSeed[] = [
  {
    name: 'Jiwan Mijhar',
    role: 'Founder, Chairperson & CEO',
    bio: 'Runs the company: what it takes on, who it answers to, and where it is going. Sits closest to the people we work for, and signs off anything that moves money.',
    sortOrder: 1,
  },
  {
    name: 'Siddhant Yadav',
    role: 'Founder, Director & CTO',
    bio: 'Runs how the software gets built — the architecture, the payment and accounting platform, and the standards the rest of it is held to. Writes code most days and reviews the rest.',
    sortOrder: 2,
  },
];

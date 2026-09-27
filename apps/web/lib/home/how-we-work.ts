/**
 * Copy for the "How we work" section's cards.
 *
 * The layout is the founder's hiring-site reference: a centred headline ringed
 * by small floating cards, over cards stacked on a curved horizon. The
 * founder's brief for the content: **readable in a glance** — a client asks
 * for a change to their website or app, our engineer says how it will be done,
 * and we keep looking after it once it is live. So every card is one beat of that story, told with a
 * picture first and as few words as it takes.
 *
 * The reference fills its cards with named people, photographs, headcounts,
 * salaries, client logos and a review score. Each is a claim about the
 * business and none is stated here until the founder gives it (see
 * `no-invented-business-data`). People are the two roles, drawn; the logos are
 * our own products; project names are the drawing's own data.
 */

/** Beat one, top-left: a client with a live site asks for a change. */
export const REQUEST = 'Can you add our new branch to the website?';

/** Beat two, right: the engineer answers, with the written scope attached. */
export const REPLY = 'On it. Scope first, then I build it.';
export const REPLY_ATTACHMENT = 'Change note';

/**
 * The centre card: what we keep doing after launch. The six lines are the
 * `/plans` "After launch" list, in the founder's words from `/how-we-work`.
 */
export const CARE = {
  title: 'After launch',
  status: 'Looked after',
  items: [
    { kind: 'domain', label: 'Domain' },
    { kind: 'hosting', label: 'Hosting' },
    { kind: 'updates', label: 'Updates' },
    { kind: 'security', label: 'Security' },
    { kind: 'backups', label: 'Backups' },
    { kind: 'support', label: 'Support' },
  ],
} as const;

/*
 * The client portal, beside the live card: every project a client has with
 * us, each at its stage, and the engineer's latest update. The founder's
 * words: clients get client.softmato.com, hold several projects there, and
 * follow them as the engineering team posts updates.
 *
 * Drawn to the Phase 8 spec (docs/PHASES.md: projects and stages, "a founder
 * updates a stage and the client sees it"), which was a placeholder page when
 * this was written — so the domain is printed in a drawn address bar, not
 * linked. Link it once the portal is live. Project names are the drawing's own
 * data.
 */
export const PORTAL = {
  url: 'client.softmato.com',
  title: 'Your projects',
  projects: [
    { name: 'Website', kind: 'web', stage: 'Live', progress: 100 },
    { name: 'Mobile app', kind: 'app', stage: 'Building', progress: 64 },
    { name: 'New branch page', kind: 'web', stage: 'Scoping', progress: 22 },
  ],
  update: {
    title: 'Security patches applied',
    body: 'Your website is up to date',
  },
} as const;

/**
 * Bottom-left, where the reference puts client logos: products we run. Mark
 * plus name — neither mark is a wordmark on its own.
 */
export const OWN_PRODUCTS = [
  { name: 'HostelPalika', src: '/products/hostelpalika/mark.png', ratio: 1 },
  {
    name: 'QuestionCall',
    src: '/products/questioncall/logo.png',
    ratio: 676 / 369,
  },
] as const;

/** Bottom-right, where the reference puts a review score. */
export const DIRECT_LINE = {
  title: 'Straight to the engineer',
  body: 'No account manager in between.',
} as const;

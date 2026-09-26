/**
 * Copy for the "How we work" section's cards.
 *
 * The layout is the founder's hiring-site reference: a centred headline ringed
 * by small floating cards, over cards stacked on a curved horizon. The
 * founder's brief for the content: **readable in a glance** — a client asks
 * for a change to their website or app, our engineer says how it will be done,
 * and it goes live. So every card is one beat of that story, told with a
 * picture first and as few words as it takes.
 *
 * The reference fills its cards with named people, photographs, headcounts,
 * salaries, client logos and a review score. Each is a claim about the
 * business and none is stated here until the founder gives it (see
 * `no-invented-business-data`). People are the two roles, drawn; the logos are
 * our own products; the amount on the checkout is the drawing's own datum.
 */

/** Beat one, top-left: the client asks. */
export const REQUEST = 'Can you add eSewa to our checkout?';

/** Beat two, right: the engineer answers, with the written scope attached. */
export const REPLY = 'On it. Scope first, then I build it.';
export const REPLY_ATTACHMENT = 'Change note';

/** Beat three, the centre card: the change, live. */
export const SHIPPED = {
  title: 'Checkout',
  status: 'Live',
  amount: 'NPR 2,400',
} as const;

/*
 * The client portal, beside the live card: every project a client has with
 * us, each at its stage, and the engineer's latest update. The founder's
 * words: clients get agency.softmato.com, hold several projects there, and
 * follow them as the engineering team posts updates.
 *
 * Drawn to the Phase 8 spec (docs/PHASES.md: projects and stages, "a founder
 * updates a stage and the client sees it"), which was a placeholder page when
 * this was written — so the domain is printed in a drawn address bar, not
 * linked. Link it once the portal is live. Project names are the drawing's own
 * data, the way the checkout's amount is.
 */
export const PORTAL = {
  url: 'agency.softmato.com',
  title: 'Your projects',
  projects: [
    { name: 'Checkout · eSewa', kind: 'web', stage: 'Live', progress: 100 },
    { name: 'Mobile app', kind: 'app', stage: 'Building', progress: 64 },
    { name: 'Website refresh', kind: 'web', stage: 'Scoping', progress: 22 },
  ],
  update: { title: 'New update', body: 'eSewa is live on your checkout' },
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

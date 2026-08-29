/**
 * How a build is scoped: static, advanced, custom — for web and for apps.
 *
 * **The axis is not size, it is who the software has to answer to.** Sorting by
 * "small / medium / large" is what produces an argument three weeks in, because
 * two people can hold different pictures of medium. Each tier below is settled
 * by one question with a yes or no answer:
 *
 *   1. Does anything change after launch?          No  → static
 *   2. Does someone need to change it without us?  Yes → advanced
 *   3. Does the software enforce rules of its own? Yes → custom
 *
 * The first "yes" you reach is the tier. It is the same ladder for a website
 * and for an app, which is why the two columns line up row for row.
 *
 * **No prices, anywhere.** A figure on a public page is an offer, and scope
 * decides the figure. The tier is what the conversation starts from; the
 * contact form's three questions place a project on this ladder before the
 * first reply.
 *
 * Placeholder copy, written to become admin-editable CMS fields.
 */
export interface Tier {
  /** Stable key, also the row's anchor and the value the contact form sends. */
  id: 'static' | 'advanced' | 'custom';
  name: string;
  /** The yes/no question that puts a project in this tier. */
  test: string;
  web: TierSide;
  app: TierSide;
}

export interface TierSide {
  /** One line on what is actually built. */
  summary: string;
  /** Three or four concrete parts. Not a feature list — the shape of the job. */
  includes: string[];
  /** What this tier deliberately does not do. Naming it prevents the argument. */
  stops: string;
}

export const TIERS: Tier[] = [
  {
    id: 'static',
    name: 'Static',
    test: 'Nothing changes after launch.',
    web: {
      summary:
        'Pages written once and published. No database, no accounts, no admin panel.',
      includes: [
        'Design and build, mobile first',
        'Copy set into the pages',
        'Forms that reach a real inbox',
        'Hosting, domain, certificate, analytics',
      ],
      stops:
        'A change to the words is a small job for us, not something you do yourself.',
    },
    app: {
      summary:
        'A published app that presents information and links out. One codebase, both stores.',
      includes: [
        'Screens, navigation, offline reading',
        'Content shipped with the build',
        'Store listing, icons, screenshots',
        'Submission to Play and the App Store',
      ],
      stops: 'No sign-in, no server, nothing to keep in sync.',
    },
  },
  {
    id: 'advanced',
    name: 'Advanced',
    test: 'Someone on your side changes it, without us.',
    web: {
      summary:
        'The same site with a database and an admin panel behind it. You edit; the site follows.',
      includes: [
        'Admin panel for pages, posts and images',
        'Search, categories, drafts and scheduling',
        'Email, SEO, sitemap, structured data',
        'Roles, so an editor is not an owner',
      ],
      stops:
        'Standard parts assembled well. Nothing here enforces a rule about your business.',
    },
    app: {
      summary:
        'Accounts, sync and notifications, with a server and an admin panel of its own.',
      includes: [
        'Sign-in, profiles, permissions',
        'Data that syncs and survives a flight-mode journey',
        'Push notifications and deep links',
        'Admin panel to run it from a desk',
      ],
      stops:
        'One app against one backend. Not a device integration and not a platform.',
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    test: 'The software has to enforce rules of its own.',
    web: {
      summary:
        'The site is the product. Built from the data model up, where being wrong has a cost.',
      includes: [
        'Payments, invoices and a ledger that balances',
        'A domain model the database enforces, not a convention',
        'Integrations with what you already run',
        'Audit trail, exports, an operations panel',
      ],
      stops:
        'Scoped in writing before anything is built, because this is the tier where guessing is expensive.',
    },
    app: {
      summary:
        'Device, platform or offline-first work — an app that is one client of a larger system.',
      includes: [
        'Camera, scanning, maps, location, hardware',
        'Offline-first with conflicts resolved by a rule, not by luck',
        'In-app payment and subscription handling',
        'Shares a backend with the web side, one source of truth',
      ],
      stops: 'Same as the web column: written scope first, build second.',
    },
  },
];

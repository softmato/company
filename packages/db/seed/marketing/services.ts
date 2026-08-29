import type { services } from '../../schema/cms';

type ServiceSeed = typeof services.$inferInsert;

/**
 * Draft copy. See ./pages.ts for the rules it follows.
 *
 * **Order matters here and it is visible.** `sortOrder` decides the order of
 * the services chapter on the home page and the services index, and the home
 * page pairs each service with a drawn still by slug
 * (`components/public/home/stills/index.ts`). A service without a still in that
 * map still renders — it falls back — but it will not be showing a picture of
 * itself, so add one when adding a service here.
 *
 * `payment-integration` is last on purpose: the founder asked on 2026-08-29 for
 * it to come off the site *for now*, and it is held as a draft rather than
 * deleted. The copy is good and the work is real; it is off the page until
 * there is a live gateway behind it (`docs/MEMORY.md`, question 17). Publishing
 * it again is one toggle in the admin panel.
 */
export const serviceSeeds: ServiceSeed[] = [
  {
    slug: 'product-engineering',
    title: 'Product engineering',
    summary: 'Taking a product from an idea to something people pay for.',
    sortOrder: 1,
    metaDescription:
      'End-to-end product engineering: architecture, build, launch and the operations after it.',
    body: `You have a product in mind, or one that exists and has stopped moving. We
take it from where it is to something that runs in production and can be
charged for.

## What this usually includes

- Working out what the first version actually is, and what it is not
- Data model and architecture — the decisions that are expensive to change later
- Building it, in the open, with something to look at every week
- Payments, invoicing and the books, if money changes hands
- Deploying it, watching it, and fixing what the first real users find

## How it runs

Staged, with a written scope for each stage and an invoice at the end of it. You
see working software throughout rather than a demo at the finish.

We build on what we know: PostgreSQL, TypeScript, Next.js, and payment
integrations we have already made work in Nepal. If your problem wants something
else, we will say so rather than reaching for the familiar.`,
  },
  {
    slug: 'web-applications',
    title: 'Web applications',
    summary:
      'Custom software for a business problem that off-the-shelf misses.',
    sortOrder: 2,
    metaDescription:
      'Custom web applications built to fit how your business actually works.',
    body: `Some problems have no product to buy. The workflow is yours, the rules are
yours, and every tool you have tried needs you to work its way instead.

## What we build

Internal tools, admin systems, portals for your customers, reporting that
matches how you actually count things. Usually replacing a spreadsheet that has
grown past what a spreadsheet can hold.

## What you get

- Software that fits the process you have, not a process you must adopt
- Roles and permissions worked out properly, so people see what they should
- Your data exportable, because it is yours
- The source code, and a handover document that assumes we are not around

## What we will tell you first

If an existing product would do the job, we will say so, even though it means
we do not get the work. Custom software costs more to own than to build, and
that is a conversation worth having at the start.`,
  },
  {
    slug: 'mobile-apps',
    title: 'Mobile apps',
    summary: 'One codebase, both stores, and a backend that keeps up with it.',
    sortOrder: 3,
    metaDescription:
      'Mobile app development for iOS and Android from one codebase, with the server and admin panel behind it.',
    body: `A phone is where most people in Nepal meet your software, and an app is not a
website in a smaller window. It is offline for part of the day, it is opened for
thirty seconds at a time, and it has to survive a store review.

## What we build

- **One codebase, both stores** — iOS and Android from the same source, so a fix
  ships to both and not to whichever we got to first
- **Accounts and sync** — data that is there in flight mode and settles
  correctly when the signal comes back, by a rule rather than by luck
- **Notifications and deep links** — the ones people keep, not the ones they
  disable in week one
- **The server behind it** — an app is a client; something has to be the source
  of truth, and you should be able to run it from a desk

## What we will tell you first

Most first apps do not need to be apps. If a fast web page would reach more
people for less, we will say so — the store review, the two release channels and
the update everyone has to accept are real costs and they never go away.

Where an app is the right answer it is usually for one of three reasons: it needs
the camera, the location or the hardware; it has to work with no signal; or
people open it every day and a browser tab is friction. Any of those, and we are
the right call.`,
  },
  {
    slug: 'payment-integration',
    title: 'Payment integration',
    summary: 'eSewa, Khalti, Fonepay and bank QR — done so the books balance.',
    sortOrder: 4,
    metaDescription:
      'Nepali payment gateway integration — eSewa, Khalti, Fonepay and manual QR — with reconciliation that adds up.',
    body: `Taking payments in Nepal is not one integration. It is a wallet, another
wallet, a bank QR, and a customer who sends a screenshot at 11pm — and then the
question of whether what you were paid matches what you recorded.

We have built this for our own products, which is why we know where it goes
wrong.

## What we handle

- **eSewa and Khalti** — the full flow, including the part everyone gets wrong:
  never trusting the browser's return URL, and confirming against the provider
- **Fonepay and bank QR** — dynamic QR where the bank supports it, manual proof
  with an approval queue where it does not
- **Reconciliation** — provider statements against your records, with the
  mismatches surfaced rather than quietly absorbed
- **Refunds** that reverse correctly in the books, not just in the wallet

## Why this is more than an API call

A payment that is confirmed twice must not be recorded twice. A payment for the
wrong amount must stop and ask rather than proceed. A payment that fails
silently must be found by a job rather than by a customer's phone call. Those
three rules are most of the work, and they are the difference between a gateway
that works in a demo and one you can run a business on.`,
  },
];

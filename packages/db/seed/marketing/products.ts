import type { productPages } from '../../schema/cms';

type ProductPageSeed = typeof productPages.$inferInsert;

/**
 * Draft copy. See ./pages.ts for the rules it follows.
 *
 * `productId` must match a row seeded by ../products — these pages reference
 * the ledger dimension, and the foreign key will reject anything else.
 *
 * **Copy is taken from each product's own live site** (hostelpalika.com,
 * questioncall.com, 2026-09-27). Say nothing here the product site does not.
 */
/** Also appended to the live row by `scripts/rename-hostelpalika.mts`. */
export const HOSTELPALIKA_GALLERY = `![HostelPalika hostel admin dashboard on the web and the Android app](/products/hostelpalika/web-and-app.webp)

![HostelPalika Android app: finding a hostel on the map with walking directions](/products/hostelpalika/app-map.webp)`;

export const productPageSeeds: ProductPageSeed[] = [
  {
    productId: 'hostelhub',
    slug: 'hostelpalika',
    title: 'HostelPalika',
    siteUrl: 'https://hostelpalika.com',
    logoUrl: '/products/hostelpalika/mark.png',
    screenshotUrl: '/products/hostelpalika/dashboard.webp',
    tagline:
      'Find verified hostels across Nepal with real photos, rent and reviews. Hostel owners run residents, fees, food and safety on HostelPalika.',
    sortOrder: 1,
    metaDescription:
      'Find verified boys, girls and co-living hostels across Nepal with real photos, rent and reviews. Hostel owners run residents, fees, food and safety on HostelPalika.',
    body: `Residents, rooms, rent, food, attendance and parents — one system and one
dedicated app instead of a register book, a spreadsheet and three WhatsApp
groups.

## For students and parents

- **Verified listings only** — every listing is checked against ownership
  papers before it goes live
- **Transparent pricing** — monthly rent, deposit and extra charges shown
  upfront
- **Real resident reviews** — from activated residents, not anonymous accounts
- **Compare and map** — prices, facilities, ratings and location side by side,
  with directions

## For hostel owners

- **Rent in Bikram Sambat months** — invoices, receipts and dues read the way
  residents and parents already count months
- **eSewa and Khalti payments, checked** — the proof is matched against the
  invoice before anything is marked paid
- **Night status** — residents mark whether they are in each night, and an SOS
  reaches staff and guardians at the same moment
- **Food, notices and maintenance** — menus, complaints and repairs reported,
  assigned and closed

## An app for every role

Owners, wardens, cooks, residents and parents each get their own screens: a
cook sees the kitchen, a parent sees their own child, and nobody sees more than
their job needs. The same account works on the web.

## Getting it

Hostels pick a plan — monthly, six-monthly or yearly — and pay for it on
[hostelpalika.com](https://hostelpalika.com), where students also find hostels
across Nepal.

## On the web and on Android

${HOSTELPALIKA_GALLERY}`,
  },
  {
    productId: 'questioncall',
    slug: 'questioncall',
    title: 'QuestionCall',
    siteUrl: 'https://questioncall.com',
    logoUrl: '/products/questioncall/icon.png',
    tagline:
      'Expert answers, guided courses, live sessions and interactive quizzes for students, in one platform.',
    sortOrder: 2,
    metaDescription:
      'QuestionCall helps students learn through expert answers, guided courses, live sessions, and interactive quizzes in one platform.',
    body: `Students post academic questions, teachers accept them live, and a private
answer screen opens right away.

## How it works

1. **Ask your question** — post it, attach a screenshot or file, and choose
   public or private
2. **A teacher picks it** — the answer screen opens with the timer already on
3. **Solve it together** — chat, share files, or switch to an audio or video
   call
4. **Get your answer** — review it and rate the help in the same place

## Beyond one answer

- **Quiz portal** — AI-generated MCQ sessions by subject and topic
- **Courses** — recorded video courses, progress tracking and premium live
  sessions
- **Public or private** — post to the public feed so others learn from it, or
  keep the answer in your own inbox

## Getting it

Available now at [questioncall.com](https://questioncall.com). Talk to us about
access for a school or an institute.`,
  },
];

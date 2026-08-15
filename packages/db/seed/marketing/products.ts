import type { productPages } from '../../schema/cms';

type ProductPageSeed = typeof productPages.$inferInsert;

/**
 * Draft copy. See ./pages.ts for the rules it follows.
 *
 * `productId` must match a row seeded by ../products — these pages reference
 * the ledger dimension, and the foreign key will reject anything else.
 *
 * **Feature lists here are deliberately conservative.** Nobody has confirmed
 * what either product ships today, so the copy describes the problem each one
 * solves and stops short of claiming a screen exists. Add features as they are
 * true.
 */
export const productPageSeeds: ProductPageSeed[] = [
  {
    productId: 'hostelhub',
    slug: 'hostelhub',
    title: 'HostelHub',
    tagline: 'Hostel management that replaces the register and the group chat.',
    sortOrder: 1,
    metaDescription:
      'HostelHub — rooms, residents, fees and records for hostels in Nepal, in one place.',
    body: `Most hostels run on a register, a calculator and a WhatsApp group. It works
until it doesn't: a room is double-booked, a fee is remembered differently by
two people, and nobody can say what last month actually came to.

HostelHub is the record everyone works from.

## What it is for

- **Rooms and residents** — who is in which room, since when, and on what terms
- **Fees** — what is due, what was paid, and what is outstanding, without a
  spreadsheet per month
- **Records** — the history that answers a question three months later, when
  memory has moved on
- **Guardians** — parents kept informed without being given the run of the
  system

## Built for how hostels here actually run

Bikram Sambat dates, because that is what the month is called. Payment through
eSewa, Khalti or bank QR, because that is how people pay. Charges that change
mid-month, students who leave early, and the fee that was settled in cash —
all normal, all handled.

## Getting it

Sold as a subscription to the hostel, not to the residents — students never pay
through this system. Talk to us about a trial for your hostel.`,
  },
  {
    productId: 'questioncall',
    slug: 'questioncall',
    title: 'QuestionCall',
    tagline: 'Practice, questions and live help for students preparing.',
    sortOrder: 2,
    metaDescription:
      'QuestionCall — question practice and live help for students, built in Nepal.',
    body: `Preparation is mostly two things: enough questions to practise on, and
someone to ask when a question will not come apart.

QuestionCall puts both in one place.

## What it is for

- **Practice** — working through questions and seeing where the gaps are
- **Live help** — reaching someone who can explain it, rather than searching for
  a video that half-answers it
- **Progress** — what has been covered and what keeps going wrong

## Why we built it

Because the students who most need help are the least likely to have someone at
home to ask. Anything that lowers the cost of asking a question is worth
building.

## Getting it

Available now. Talk to us about access for a school or an institute.`,
  },
];

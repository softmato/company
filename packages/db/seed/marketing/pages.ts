import type { pages } from '../../schema/cms';

type PageSeed = typeof pages.$inferInsert;

/**
 * Real copy, drafted from docs/PRD.md and the code that exists — not
 * placeholder text. Still seeded as **draft**: a founder reads it, edits it in
 * the admin panel, and publishes when it says what they want it to say.
 *
 * Nothing here invents a fact. No client names, no headcount, no founding
 * year, no testimonials, no numbers that would need checking. Where a claim
 * would need evidence, the sentence describes how the work is done instead.
 */
export const pageSeeds: PageSeed[] = [
  {
    slug: 'home',
    title: 'Softmato',
    metaTitle: 'Softmato — software products and project work, built in Nepal',
    metaDescription:
      'A Nepali software company in Kathmandu. We build and run our own products, and take on project work for companies who need software that lasts.',
    body: `We build software in Kathmandu — our own products, and project work for
companies who need something built properly.

## What we do

**We run our own products.** HostelHub and QuestionCall are ours: we designed
them, we host them, and we answer the phone when something breaks. Running what
we build is what keeps us honest about how we build it.

**We take on project work.** Websites, applications, and the awkward
integrations in between — the payment gateway that has to reconcile, the
reporting nobody can get right, the system that has to keep working after we
hand it over.

## How we work

Small team, direct contact. You talk to the people writing the code, not to an
account manager relaying messages.

We are careful about money and data. Payments run through providers licensed by
Nepal Rastra Bank; card numbers and wallet PINs never touch our servers. Every
financial action leaves an audit trail, because a system that handles money
should be able to say who did what and when.

We write things down. Scope, decisions, and what changed are all recorded, so a
handover is a document rather than a conversation you have to remember.`,
  },
  {
    slug: 'about',
    title: 'About',
    metaDescription:
      'Softmato Technology Pvt Ltd is a software company in Kathmandu building its own products and taking on project work.',
    body: `Softmato Technology Pvt Ltd is a software company registered in Nepal and
working from Kathmandu.

## Two kinds of work, one company

We started by building products we wanted to exist. HostelHub came out of
watching hostels run on registers and WhatsApp; QuestionCall came out of the
same instinct applied to a different problem. Both are live, both are ours, and
both pay for themselves.

Project work came second and stayed, because it turns out the two feed each
other. Building for a client teaches you what a product should do; running a
product teaches you what a client's system will look like in two years.

## What we believe about software

**Correctness is not a feature.** Books that balance, invoices that number
without gaps, payments that cannot be recorded twice — these are not extras to
add later. They are the reason the software exists, and they belong in the
foundations.

**Boring choices age well.** We prefer the database enforcing a rule to a
comment asking people to remember it, and a smaller system that works to a
larger one that mostly works.

**Nepal is not an edge case.** Bikram Sambat dates, eSewa and Khalti, wallet
limits, a Sunday-to-Friday week, and the fact that nobody here can auto-debit a
subscription — these shape the software from the start rather than being bolted
on for a local release.

## Where we are going

More products of our own, and enough project work to fund them. We would rather
grow slowly and still be here in ten years.`,
  },
  {
    slug: 'services',
    title: 'Services',
    metaDescription:
      'Product engineering, custom web applications, and Nepali payment integration — from a team that runs its own software.',
    body: `Three things we do well. If what you need is next to one of them, ask —
we will tell you honestly whether we are the right people for it.

Every engagement starts with a written scope: what gets built, what it costs,
and when it lands. Fixed scope where the work is knowable, staged where it is
not. You own the deliverables once the final invoice is settled, and you get
the source code either way.`,
  },
  {
    slug: 'products',
    title: 'Products',
    metaDescription:
      'HostelHub and QuestionCall — software Softmato builds, runs and supports.',
    body: `The software we own and operate. We are the ones who host it, patch it,
and answer when it breaks.

Both run on the same foundations: one payment platform, one set of books, and
the same rules about who may see what.`,
  },
  {
    slug: 'team',
    title: 'Team',
    metaDescription: 'The people behind Softmato Technology.',
    body: `A small team in Kathmandu. Everyone here writes, ships, or supports the
software — there is no layer between you and the people doing the work.`,
  },
  {
    slug: 'careers',
    title: 'Careers',
    metaDescription:
      'Working at Softmato — small team, real ownership, software that has to be correct.',
    body: `We hire rarely and carefully.

## What working here is like

You will own something end to end — not a ticket queue, but a part of the
system whose behaviour in production is yours to understand. You will read more
code than you write, and you will be asked why more often than how.

We work Sunday to Friday from Kathmandu. Some work is remote-friendly; the
payment and accounting work usually is not, because it moves faster in a room.

## What we look for

- You can explain a decision, including the parts you are unsure about.
- You care whether the numbers are right, not just whether the screen renders.
- You would rather delete code than add to it.
- Experience with money, accounting, or payments is a real advantage; being
  willing to learn it properly is most of the way there.

## Open roles

Nothing open right now. Write to us anyway if this sounds like the place you
want to work — we keep good letters, and we answer them.`,
  },
  {
    slug: 'contact',
    title: 'Contact',
    metaDescription:
      'Talk to Softmato Technology about a project, a product, or an invoice.',
    body: `Tell us what you are trying to build, or what has gone wrong, and we will
reply — usually within a working day.

**Working on something?** A paragraph about the problem is more useful than a
detailed specification. We would rather understand the shape of it first.

**Already a customer?** Include your invoice number or transaction reference
and we can find you straight away.`,
  },
];

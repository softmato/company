import type { blogPosts } from '../../schema/cms';

type BlogPostSeed = typeof blogPosts.$inferInsert;

/** Draft copy. See ./pages.ts for the rules it follows. */
export const blogPostSeeds: BlogPostSeed[] = [
  {
    slug: 'why-we-built-our-own-payment-platform',
    title: 'Why we built our own payment platform',
    excerpt:
      'Every new product meant another eSewa integration, another set of credentials, and another reconciliation nobody wanted to do. So we stopped.',
    tags: ['payments', 'engineering', 'nepal'],
    metaDescription:
      'Why Softmato built one internal payment platform instead of integrating eSewa and Khalti separately in every product.',
    body: `Collecting money for our own products used to work like this. A customer
scanned a static QR code, paid, and sent a screenshot. One of us opened the
wallet app, found the transaction, decided it matched, and marked the account
paid. Then we started the service.

It worked. It also had no audit trail, produced no books, and told us nothing
about which product was actually making money.

## The problem was not the QR code

The obvious fix is to integrate a payment gateway. But we have more than one
product, and each new one would need its own eSewa integration, its own Khalti
credentials, its own webhook handling, and its own reconciliation. Four
products, four half-correct implementations of the same thing, and four places
for the same bug.

The second thing we noticed: the hard part is not taking the payment. The hard
part is everything after it. A confirmation that arrives twice must not be
recorded twice. An amount that does not match must stop rather than proceed. A
payment that fails silently has to be found by something other than a customer
calling.

## What we built instead

One platform. A product creates an invoice, asks for a checkout session,
redirects the customer, and waits for a signed webhook. It never sees a
provider credential and never reads a gateway's documentation.

Behind that sits the part that actually matters: a ledger where every payment
posts a balanced journal entry, and where the database itself refuses to record
one that does not balance. Not application code that checks — the database,
which cannot be talked out of it by a bug in a hurry.

## What Nepal changed

Three things shaped this more than any architectural preference.

**No auto-debit.** Wallets here have no reliable way for a merchant to charge a
saved customer. Every renewal is a payment the customer makes themselves, so
the system is built around invoicing and reminding rather than charging.

**Manual QR is not a fallback, it is a first-class method.** It is how a lot of
business is still done, and it stays useful the day a gateway goes down. So it
gets the same treatment as any provider: a proof upload, an approval queue, and
a journal entry when it is approved.

**The books are in Bikram Sambat.** The fiscal year runs Shrawan to Ashad, and
month boundaries do not line up with anything Gregorian. Fiscal periods are
seeded from published tables rather than computed, because a library upgrade
must never be able to move a boundary under posted history.

## What it cost

More than the shortcut, less than four shortcuts. The next product we launch
gets payments by being issued credentials.`,
  },
];

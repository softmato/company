import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const sla: LegalDocumentSeed = {
  slug: 'sla',
  title: 'Service Level Agreement',
  body: body(
    `This agreement applies to **paid hosted products we run ourselves**. Free
plans, trials, beta features, and project work in development are excluded —
for those we do our best, but we promise nothing measurable.

A site or application we built for you and handed over is **not** covered here.
Once it runs on your own hosting it is yours to keep running. Where we continue
to host or maintain it for you, the commitments are the ones written into that
maintenance agreement, not these.`,

    `## 1. Availability

We target **99.5% availability each calendar month**, measured as the
proportion of five-minute intervals in which the service responded to a request
for its main page or API.

99.5% allows roughly three and a half hours of unavailability in a month. We
have set the number where we can keep it rather than where it sounds best.

The following do not count against availability:

- **Scheduled maintenance**, announced in advance (section 3).
- Failure of an upstream service we do not run — a payment provider, a bank, a
  hosting platform, or a third-party service the product depends on.
- Failure of your own network, device, or internet connection.
- Suspension for non-payment or for breach of the Acceptable Use Policy.
- Events outside our reasonable control — power failure, telecom outage, bandh,
  natural disaster, or an act of government.`,

    `## 2. Support

**Critical issues are answered around the clock, every day of the year.** A
hosted product does not stop running outside office hours and the businesses
depending on it do not stop trading, so our response to a critical failure does
not wait for the morning either.

| Severity | What it means | We respond within |
| --- | --- | --- |
| **P1 — Critical** | Service down, data at risk, or no user can complete a core task | 1 hour, any day, any hour |
| **P2 — High** | A major feature is unusable, no workaround | 4 hours, any day |
| **P3 — Normal** | A feature is impaired, or there is a workaround | 1 business day |
| **P4 — Low** | Question, cosmetic issue, feature request | 3 business days |

Business days run **Sunday to Friday** — Saturday is the weekly holiday in
Nepal — and exclude public holidays. P1 and P2 do not wait for a business day.

These are **response** targets, not resolution targets: the first is a promise
we can keep, the second depends on what broke. For a P1 we will keep you
informed at least every **2 hours** until it is resolved.

Report an issue to **{{company.support_email}}**.
A P1 outside office hours may also be raised at **{{company.emergency_phone?}}**.`,

    `## 3. Maintenance

Routine maintenance runs in a window of **Sunday 00:00–04:00 Nepal time**, announced at least **48 hours** in advance by email.

Emergency maintenance — a security fix that cannot wait — may run at any time.
We will tell you as soon as we reasonably can, before it starts where possible.`,

    `## 4. Service credits

If availability in a month falls below the target, you may claim a credit
against the following month's fee for that product:

| Availability that month | Credit |
| --- | --- |
| Below 99.5% but at least 99.0% | 5% of the monthly fee |
| Below 99.0% but at least 95.0% | 10% of the monthly fee |
| Below 95.0% | 25% of the monthly fee |

Claim in writing within **30 days** of the end of the affected month, with the
dates and times you observed. Credits are applied to a future invoice; they are
not paid out in cash, and they are the sole remedy for missing the target.

Credits are not available while an invoice is overdue.`,

    `## 5. Backups and data

We take **daily** backups of application data
and retain them for **30 days**. On request we will restore to
the most recent backup; restoring loses anything written after the point
restored to.

Backups are a recovery measure for our own systems. They are not a substitute
for your own export of anything you cannot afford to lose.`,

    `## 6. Changes and contact

This agreement is versioned. Where we reduce a commitment we will give at least
**30 days** notice, and the version that applied on any past date remains
available.

${CONTACT_BLOCK}`,
  ),
};

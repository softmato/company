import { body, COMPANY, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const terms: LegalDocumentSeed = {
  slug: 'terms',
  title: 'Terms of Service',
  body: body(
    `These terms govern your use of the products and services provided by ${COMPANY}
("Softmato", "we", "us"), a company registered in Nepal. By creating an account,
signing a proposal, or paying an invoice, you agree to them.`,

    `## 1. What we provide

Three kinds of work. The terms differ where it matters.

- **Our own products** — software we design, build and run ourselves, sold to
  you on a subscription. Each product is a brand of this company, not a
  separate company.
- **Project work** — software, websites, applications, design, search
  optimisation, payment integration and dashboards built for you under a
  written proposal. The proposal governs where it conflicts with this document.
- **Training and internships** — supervised practical training, whether
  arranged with you directly or with the institution you come from. Those are
  governed by their own written agreement.

### These terms are the umbrella

Each of our products publishes its own terms, on its own site, describing the
things only that product does. Those terms sit **under** this document: they
may add detail and they may promise you more, but they cannot promise you less
than this one does. Where a product's terms and these conflict, the term more
favourable to you applies.`,

    `## 2. Your account

You are responsible for what happens under your account. Keep credentials
secret, use a strong password, and tell us promptly if you suspect misuse. We
may require two-factor authentication for accounts with administrative or
financial access, and we do so for our own.

You must be at least 18 years old, or represent a registered business, to hold
a paid account.`,

    `## 3. Fees, invoices and taxes

Prices are in Nepalese Rupees (NPR) unless the invoice says otherwise. Every
invoice states its number, date, and the tax applied.

- Softmato is PAN-registered and **not currently VAT-registered**, so no VAT is
  charged on our invoices. If that changes we will say so, and VAT will be
  charged at the prevailing rate under the **Value Added Tax Act, 2052**.
- Where you are required to deduct tax at source under the **Income Tax Act,
  2058**, deduct it, pay the balance, and send us the TDS certificate. Payment
  net of TDS is treated as payment in full only once we receive that
  certificate.
- Invoices are payable within **15 days** of issue. A product or a proposal may
  set a different period, but never shorter than **7 days**.

We do not charge a late fee. Where an invoice stays unpaid past its due date
we may suspend the service after notice, as described in section 5.`,

    `## 4. How payments work

### When you pay us

Payments are processed by payment service providers licensed by **Nepal Rastra
Bank** — currently eSewa, Khalti and, where enabled, Fonepay — or by direct
bank transfer against a QR code with proof of payment. We never see or store
your card number, wallet PIN, or banking password; those stay with the provider
and its bank.

Subscriptions do **not** auto-debit. Nepali wallets do not support reliable
server-initiated charges, so every renewal is a payment you make yourself. We
invoice ahead of the renewal date and remind you; nothing is taken from your
account automatically.

### When payments run through our products to you

Some of our products let your own customers pay you through software we built —
a resident paying a hostel, for example. In that arrangement:

- You supply **your own** merchant credentials, for your own account with your
  own payment provider. We store them encrypted and use them for one purpose
  only: routing your customers' payments to you.
- The money moves **directly from the payer to your account**. It does not pass
  through us and we never hold it, not even briefly. **We are not a bank and
  not a licensed payment service provider.**
- Your agreement with your payment provider is yours. Its fees, limits,
  verification requirements and settlement times are between you and it.
- A payment your customer makes to you is a transaction between you and them.
  Refunds, disputes, receipts, and any tax on it are yours to handle. Our
  Refund and Cancellation Policy covers what **you pay us** — not what your
  customers pay you.
- Keeping those credentials current, accurate and lawful is your
  responsibility. If they are wrong, expired, or suspended by your provider,
  payments to you will fail, and money that never reached you is not money we
  can recover.`,

    `## 5. Subscriptions, renewal and suspension

A subscription runs for the period stated on the invoice. If a renewal invoice
is not paid by its due date, the subscription enters a grace period of at least
**7 days**, after which access is suspended. A product may give you longer;
none gives you less.

Suspension is not deletion. Your data is retained for at least **30 days**, and
by default **90 days**, so a late payment restores the service intact. After
that it may be deleted permanently. Records we are required to keep for tax or
accounting are kept as long as the law requires, as described in our Privacy
Policy.

You may cancel at any time. Cancellation stops the next renewal; it does not
refund the period already paid for, except as set out in our Refund and
Cancellation Policy.`,

    `## 6. Project work

### What becomes yours, and what stays ours

Unless the proposal says otherwise:

- **Deliverables built specifically for you become yours on full payment.**
  Until the final invoice is settled, we retain ownership of the work.
- Tools, libraries and components we built before or outside your project stay
  ours; you get a perpetual licence to use them within the delivered work.
- Our own products, brand, and platform remain ours in all cases.
- We may name you as a client and describe the work in general terms unless you
  ask us in writing not to.

Third-party licences, domain fees, and hosting bought on your behalf are yours
to pay and yours to keep.

### What we need from you

A project runs on decisions and access. Within a reasonable time you will give
us the content, brand assets and information the work needs; access to the
systems, accounts and third-party services we have to integrate with; and one
person who can approve decisions on your behalf. Where we are held up waiting
on these, the timeline moves by the length of the delay, and a stage that has
to be restarted may be re-invoiced.

### Changes to scope

The proposal defines what is being built. Anything outside it is a change: we
will tell you what it costs and how it moves the timeline, and we will not
start it until you agree in writing. Small clarifications are absorbed; new
features are not.

### Acceptance and defects

When a stage is delivered you have the period stated in the proposal to test it
and tell us what is wrong. Where the proposal is silent that period is
**7 days**, after which the stage is treated as accepted.

Whether a free defect-correction period follows delivery, and how long it runs,
is set by the proposal. Where the proposal is silent, we correct defects in
what was specified for **30 days** after delivery at no charge. That covers
delivered work failing to do what the proposal said it would. It does not cover
new features, changes of mind, a third-party service changing under us, or
content and configuration you control.

### Search optimisation

Where the work includes search engine optimisation, we apply current practice
and report what we did. **We do not guarantee any ranking, traffic volume, or
search position**, and no supplier honestly can: search engines change how they
rank without notice and nobody outside them controls the result. Any figure
discussed beforehand is a target, not a commitment.`,

    `## 7. Acceptable use, availability and confidentiality

Your use of the services is subject to our Acceptable Use Policy. Availability
commitments for paid hosted products are in our Service Level Agreement.

Each of us will keep the other's non-public information confidential and use it
only for the purpose it was shared for. This survives the end of the agreement
by **3 years**.`,

    `## 8. Warranties and liability

We provide the services with reasonable skill and care. Beyond that, and to the
extent Nepali law allows, the services are provided as they are, without
implied warranty of fitness for a particular purpose.

Nothing here limits liability for fraud, wilful misconduct, or anything that
cannot be limited under the **Consumer Protection Act, 2075** or other
prevailing law.

Subject to that, our total liability arising out of the services is limited to
whichever is **greater**:

- the fees you paid us in the **three months** before the event giving rise to
  the claim; or
- for project work, the total fees paid under the proposal the claim relates to.

A product or a proposal may set a higher cap. None may set a lower one. Neither
of us is liable for indirect or consequential loss, including lost profits or
lost data where a backup was available.`,

    `## 9. Events outside our control

Neither party is liable for failure caused by events beyond reasonable control,
including power failure, internet or telecom outage, action by a bank or
payment provider, strike or bandh, natural disaster including earthquake and
flood, epidemic, or an act of government. We will tell you promptly and resume
as soon as we reasonably can.`,

    `## 10. Termination

Either of us may end the agreement on **30 days** written notice, or
immediately if the other commits a material breach that is not cured within
15 days of being told about it. A product or a proposal may require longer
notice; none requires less.

On termination you remain liable for work already done and periods already
begun. We will make your data available for export for at least **30 days**.`,

    `## 11. Changes to these terms

These terms are versioned. When we change them we publish a new version with a
new effective date; earlier versions remain available, because what you agreed
to on a given date has to stay knowable. Material changes will be notified by
email at least **14 days** in advance. The same applies to the terms published
by each of our products.`,

    `## 12. Governing law and disputes

These terms are governed by the laws of Nepal, including the **Electronic
Transactions Act, 2063**, under which records and communications in electronic
form are legally recognised.

If a dispute arises, we will first try to resolve it by discussion in good
faith for 30 days. Failing that, the courts at **Kathmandu** have exclusive
jurisdiction.`,

    `## 13. Contact

${CONTACT_BLOCK}`,
  ),
};

import { body, COMPANY, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const terms: LegalDocumentSeed = {
  slug: 'terms',
  title: 'Terms of Service',
  body: body(
    `These terms govern your use of the products and services provided by ${COMPANY}
("Softmato", "we", "us"), a company registered in Nepal. By creating an account,
signing a proposal, or paying an invoice, you agree to them.`,

    `## 1. What we provide

Two kinds of work, and the terms differ where it matters:

- **Products** — software we build and run ourselves, sold on a subscription.
- **Project work** — software built for you under a written proposal or scope
  of work. The proposal governs where it conflicts with this document.`,

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
- Invoices are payable within **15 days** of issue unless the proposal says
  otherwise.

We do not charge a late fee. Where an invoice stays unpaid past its due date
we may suspend the service after notice, as described in section 5.`,

    `## 4. How payment works

Payments are processed by payment service providers licensed by **Nepal Rastra
Bank** — currently eSewa, Khalti and, where enabled, Fonepay — or by direct
bank transfer against a QR code with proof of payment.

**We are not a bank and not a licensed payment service provider.** We do not
hold your money on deposit, and we never see or store your card number, wallet
PIN, or banking password. Those stay with the provider and its bank.

Subscriptions do **not** auto-debit. Nepali wallets do not support reliable
server-initiated charges, so every renewal is a payment you make yourself. We
invoice ahead of the renewal date and remind you; nothing is taken from your
account automatically.`,

    `## 5. Subscriptions, renewal and suspension

A subscription runs for the period stated on the invoice. If a renewal invoice
is not paid by its due date, the subscription enters a grace period of
**7 days**, after which access is suspended.

Suspension is not deletion. Your data is retained for
**90 days** so a late payment
restores the service intact. After that it may be deleted permanently.

You may cancel at any time. Cancellation stops the next renewal; it does not
refund the period already paid for, except as set out in our Refund and
Cancellation Policy.`,

    `## 6. Project work and intellectual property

Unless the proposal says otherwise:

- **Deliverables built specifically for you become yours on full payment.**
  Until the final invoice is settled, we retain ownership of the work.
- Tools, libraries and components we built before or outside your project stay
  ours; you get a perpetual licence to use them within the delivered work.
- Our own products, brand, and platform remain ours in all cases.
- We may name you as a client and describe the work in general terms unless you
  ask us in writing not to.

Third-party licences, domain fees, and hosting bought on your behalf are yours
to pay and yours to keep.`,

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
the fees you paid us in the **three months** before the event giving rise to
the claim, and neither of us is liable for indirect or consequential loss,
including lost profits or lost data where a backup was available.`,

    `## 9. Events outside our control

Neither party is liable for failure caused by events beyond reasonable control,
including power failure, internet or telecom outage, action by a bank or
payment provider, strike or bandh, natural disaster including earthquake and
flood, epidemic, or an act of government. We will tell you promptly and resume
as soon as we reasonably can.`,

    `## 10. Termination

Either of us may end the agreement on **30 days**
written notice, or immediately if the other commits a material breach that is
not cured within 15 days of being told about it.

On termination you remain liable for work already done and periods already
begun. We will make your data available for export for
**30 days**.`,

    `## 11. Changes to these terms

These terms are versioned. When we change them we publish a new version with a
new effective date; earlier versions remain available, because what you agreed
to on a given date has to stay knowable. Material changes will be notified by
email at least **14 days** in advance.`,

    `## 12. Governing law and disputes

These terms are governed by the laws of Nepal, including the **Electronic
Transactions Act, 2063**, under which records and communications in electronic
form are legally recognised.

If a dispute arises, we will first try to resolve it by discussion in good
faith for 30 days. Failing that, the courts at
**Kathmandu** have
exclusive jurisdiction.`,

    `## 13. Contact

${CONTACT_BLOCK}`,
  ),
};

import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const aup: LegalDocumentSeed = {
  slug: 'aup',
  title: 'Acceptable Use Policy',
  body: body(
    `This policy sets the boundary of what our products and services may be used
for. It applies to everyone using them, including your own users and anyone you
give access to. Breaking it is a material breach of the Terms of Service.`,

    `## 1. Nothing illegal under Nepali law

You may not use our software for anything prohibited in Nepal. The categories
that come up most often for us:

- **Gambling, betting, and lotteries.** Online gambling is not permitted in
  Nepal.
- **Cryptocurrency trading, exchange, mining, or investment schemes.** Nepal
  Rastra Bank has prohibited cryptocurrency transactions. This applies to
  project work too: we will not build one.
- **Regulated activity you are not licensed for** — deposit-taking, lending,
  foreign exchange dealing, or remittance without the licence Nepali law
  requires.
- Content prohibited under the **Electronic Transactions Act, 2063**, including
  material that is obscene, that incites hatred or communal disharmony, or that
  is published to defame a person.
- Trade in narcotics, weapons, wildlife, human organs, counterfeit goods, or
  anything else whose sale is an offence.`,

    `## 2. If your customers pay you through one of our products

Where a product lets your own customers pay you using your own merchant
credentials:

- The credentials must be **yours**, for your own registered business. Do not
  use someone else's account, and do not collect another business's payments
  through your own.
- Do not take payment for goods or services you do not intend to provide.
- Keep the credentials current, and tell us if your payment provider suspends
  or closes your account.
- Follow your payment provider's own rules. Your agreement with them is yours,
  and we cannot keep your account with them in good standing on your behalf.

The money moves directly from your customer to you. Disputes about it are
between the two of you, and we are not in a position to arbitrate them.`,

    `## 3. No harm to the service or to others

- No attempt to break, probe, or overload our systems, and no penetration
  testing without our written agreement. Report a vulnerability instead — see
  section 6.
- No malware, no phishing pages, no command-and-control infrastructure.
- No scraping or automated bulk access beyond documented API limits, and no
  using our infrastructure to scrape someone else.
- No unsolicited bulk email or SMS, and no using our name or domains as the
  sender of one.
- No sharing credentials between people, and no reselling access to a
  subscription that was sold to you.
- No using our services to build or train a competing product out of what you
  can see of ours.
- Do not misrepresent your identity, or imply we endorse or are affiliated with
  something we are not.`,

    `## 4. Content and data you put into our products

You are responsible for what you upload and for having the right to upload it.
Do not upload material that infringes copyright or a trademark, and do not
upload another person's personal information without a lawful basis for it.

Where you put your own customers' personal information into one of our products,
you decide what goes in and why; we hold it for you and act on your
instructions. That relationship is set out in our Privacy Policy.

We do not review uploads in advance. When something is reported and turns out
to break this policy, we remove it.`,

    `## 5. What happens if you break this policy

Depending on severity we may: ask you to fix it; remove the offending content;
suspend the account; or terminate it. Where the breach is serious or ongoing —
fraud, malware, an offence under Nepali law — we may suspend first and ask
afterwards, and we may be obliged to inform the police or another authority
acting within its powers.

Suspension for breach does not entitle you to a refund of the current term.`,

    `## 6. Reporting abuse or a vulnerability

Tell us at **{{company.abuse_email}}**. For a security vulnerability, please
give us a reasonable chance to fix it before making it public; we will not
pursue anyone who reports in good faith and does not access or damage other
people's data.

${CONTACT_BLOCK}`,
  ),
};

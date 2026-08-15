import { body, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const aup: LegalDocumentSeed = {
  slug: 'aup',
  title: 'Acceptable Use Policy',
  body: body(
    `This policy sets the boundary of what our services may be used for. It
applies to everyone using them, including your own users and anyone you give
access to. Breaking it is a material breach of the Terms of Service.`,

    `## 1. Nothing illegal under Nepali law

You may not use the services for anything prohibited in Nepal. The categories
that matter most for a payment and software platform:

- **Gambling, betting, and lotteries.** Online gambling is not permitted in
  Nepal, and payments for it are not permitted here.
- **Cryptocurrency trading, exchange, mining or investment schemes.** Nepal
  Rastra Bank has prohibited cryptocurrency transactions; we cannot process
  them, and an account doing so will be closed.
- **Unlicensed financial services** — deposit-taking, lending, foreign exchange
  dealing, remittance, or acting as a payment aggregator — without the licence
  Nepali law requires for it.
- **Hundi, hawala, or any informal value transfer**, and any transaction
  designed to disguise the source of funds.
- Content prohibited under the **Electronic Transactions Act, 2063**, including
  material that is obscene, that incites hatred or communal disharmony, or that
  is published to defame a person.
- Trade in narcotics, weapons, wildlife, human organs, counterfeit goods, or
  anything else whose sale is an offence.`,

    `## 2. No fraud or misuse of payments

- Do not accept payment for goods or services you do not intend to provide.
- Do not process a payment on behalf of another business without telling us —
  a merchant account is for your own trade, not a channel for someone else's.
- Do not test the payment system with stolen credentials or someone else's
  wallet.
- Provide identifying information when we are required to ask for it. Where a
  payment provider or a regulator requires customer verification, we will pass
  the requirement on and act on the answer.

We report suspected fraud or money laundering to the relevant authority and to
the payment provider concerned.`,

    `## 3. No harm to the service or to others

- No attempt to break, probe, or overload our systems, and no penetration
  testing without our written agreement. Report a vulnerability instead —
  see below.
- No malware, no phishing pages, no command-and-control infrastructure.
- No scraping or automated bulk access beyond documented API limits.
- No unsolicited bulk email or SMS, and no using our name or domains as the
  sender of one.
- No sharing credentials between people, and no reselling access to a
  subscription that was sold to you.`,

    `## 4. Content you upload

You are responsible for what you upload and for having the right to upload it.
Do not upload material that infringes copyright or a trademark, and do not
upload another person's private information without their consent.

We do not review uploads in advance. When something is reported and turns out
to break this policy, we remove it.`,

    `## 5. What happens if you break this policy

Depending on severity we may: ask you to fix it; remove the offending content;
suspend the account; or terminate it. Where the breach is serious or ongoing —
fraud, malware, an offence under Nepali law — we may suspend first and ask
afterwards, and we may be obliged to inform the police, Nepal Rastra Bank, or
the payment provider.

Suspension for breach does not entitle you to a refund of the current term.`,

    `## 6. Reporting abuse or a vulnerability

Tell us at **[confirm: abuse email]**. For a security vulnerability, please
give us a reasonable chance to fix it before making it public; we will not
pursue anyone who reports in good faith and does not access or damage other
people's data.

${CONTACT_BLOCK}`,
  ),
};

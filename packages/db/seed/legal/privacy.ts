import { body, COMPANY, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const privacy: LegalDocumentSeed = {
  slug: 'privacy',
  title: 'Privacy Policy',
  body: body(
    `${COMPANY} collects and uses personal information to run its products and
services. This policy explains what we hold, why, who else sees it, and what
you can ask us to do about it. It is written to the **Individual Privacy Act,
2075 (2018)** and the **Individual Privacy Regulation, 2077**, which give every
person in Nepal a right to privacy in their personal information.`,

    `## 1. What we collect

**You give us:**

- Name, email address, phone number, and organisation when you create an
  account, send an enquiry, or are invoiced.
- Billing details needed for a tax invoice — address, PAN or VAT number.
- Anything you write to us: enquiry messages, support requests, project
  documents you upload.

**The service records as you use it:**

- Account activity — sign-ins, changes to content, administrative actions. Our
  audit log keeps who did what and when, because a system that handles money
  needs to be able to answer that question.
- Payment records — amount, date, provider, provider transaction reference, and
  the status of the payment.
- Technical data — pages requested, browser and device type, and error reports.

**What we deliberately do not collect:**

- **Card numbers, wallet PINs, and banking passwords never reach our servers.**
  Payments are completed on the systems of payment providers licensed by Nepal
  Rastra Bank, and they return only a reference and a status to us.
- We do not store the IP address of a contact-form visitor. We store a one-way
  hash of it, used only to stop the same source flooding the form.`,

    `## 2. Why we use it

| Purpose | Why we may |
| --- | --- |
| Providing the service you asked for | Performance of our agreement with you |
| Invoicing, accounting, tax filing | Legal obligation under Nepali tax law |
| Fraud prevention and security | Our legitimate interest in a safe service |
| Support and replying to enquiries | Your request |
| Product notices and service emails | Necessary to the service |
| Marketing email | Only with your consent, withdrawable at any time |

We do not sell personal information, and we do not use it for automated
decisions that produce legal effects.`,

    `## 3. Who else sees it

We use a small number of processors, each for one job:

| Processor | What it handles | Where |
| --- | --- | --- |
| Payment providers (eSewa, Khalti, Fonepay, banks) | Completing payments | Nepal |
| Hosting and application platform | Running the website and app | Mumbai, India |
| Managed database | Application and accounting data | [confirm: region] |
| Object storage | Uploaded files, invoice PDFs, images | [confirm: region] |
| Email delivery | Transactional email | Outside Nepal |
| Error monitoring | Crash and error reports | Outside Nepal |

Some of these operate servers outside Nepal, so your information may be stored
or processed abroad. We choose providers that offer contractual protection and
encryption in transit and at rest.

We also disclose information where the law requires it — to a court, tax
authority, or regulator acting within its powers — and to a professional
adviser bound by confidentiality, such as our accountant or auditor.`,

    `## 4. How long we keep it

- **Accounting and tax records**, including invoices and payment records, are
  kept as long as prevailing Nepali tax law requires — currently at least five
  years from the end of the relevant income year. These we cannot delete on
  request.
- **Account data** is kept while the account is active and for
  **90 days** after closure.
- **Contact enquiries** are kept for **24 months**.
- **Technical logs and error reports** are kept for
  **90 days**.`,

    `## 5. How we protect it

Traffic is encrypted in transit. Administrative accounts require a password and
a time-based one-time code — two-factor authentication is mandatory, not
optional — and the secrets behind those codes are encrypted at rest. Passwords
are stored using a modern password hash, never in a readable form. Every
change to content and every financial action is written to an audit log.

Files that contain customer information — payment proofs, invoice PDFs, project
documents — are held in private storage reachable only through a short-lived
signed link issued after we check who is asking.

No system is perfectly secure. If a breach affects your information in a way
likely to harm you, we will tell you and the appropriate authority without
undue delay.`,

    `## 6. Your rights

Under the Individual Privacy Act, 2075 you may ask us to:

- **tell you** what personal information we hold about you;
- **correct** anything inaccurate;
- **delete** information we no longer have a legal reason to keep;
- **stop** using your information for marketing;
- **give you a copy** of what you provided, in a usable format.

Write to the address below. We will respond within
**15 days**. If you are not satisfied, you may
complain to the relevant authority or apply to the court under the Act.`,

    `## 7. Children

Our services are meant for businesses and adults. We do not knowingly collect
information from anyone under 18. If you believe a child has given us personal
information, tell us and we will delete it.`,

    `## 8. Cookies

Our website uses a small number of cookies, described in our Cookie Policy.`,

    `## 9. Changes and contact

This policy is versioned. When it changes we publish a new version with a new
effective date and keep the earlier ones available.

Questions, requests, or complaints about privacy:

${CONTACT_BLOCK}`,
  ),
};

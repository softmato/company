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
- Where a product routes your own customers' payments to you, the merchant
  credentials for your own payment provider account. How those are handled is
  in section 3.

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
  hash of it, used only to stop the same source flooding the form.

If you apply for a job or an internship with us, what we collect and how long
we keep it is described separately in our **Candidate Privacy Notice**.`,

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

    `## 3. When we hold information for you

Some of what passes through our systems is not ours, and is not about our own
customers. The difference matters, because it changes who answers for it.

**Information you put into one of our products.** A hostel using our software
holds records about its residents; a business using it holds records about its
own customers. That information is **yours**. You decide what goes in and why.
We hold it on your behalf and act on your instructions — we do not use it for
our own purposes, do not sell it, and do not mine it to build something else.
When you leave, we return or delete it as described in section 5.

**Your merchant credentials.** Where a product routes your customers' payments
to you, the credentials you give us are **encrypted at rest, never displayed
back in full, and used for one purpose only** — routing those payments to your
account. We never use them to take money for ourselves. The payments they
authorise move directly from the payer to you and never pass through us.

**Access to your systems during project work.** Project work sometimes needs
access to your live systems. We take the narrowest access that does the job,
keep it only as long as the job takes, and give it up at the end. Anything we
see there is confidential under section 7 of the Terms of Service.

In all three, you are answerable to the people the information is about, and we
are answerable to you. If one of those people contacts us directly, we will
point them to you rather than answer on your behalf.`,

    `## 4. Who else sees it

We use a small number of processors, each for one job:

| Processor | What it handles | Where |
| --- | --- | --- |
| Payment providers (eSewa, Khalti, Fonepay, banks) | Completing payments | Nepal |
| Hosting and application platform | Running the website and app | Outside Nepal |
| Managed database | Application and accounting data | Outside Nepal |
| Object storage | Uploaded files, invoice PDFs, images | Outside Nepal |
| Email delivery | Transactional email | Outside Nepal |
| Error monitoring | Crash and error reports | Outside Nepal |

Everything except payment processing runs on servers outside Nepal, so your
information is stored and processed abroad. We choose providers that offer
contractual protection and encryption in transit and at rest. Some of them
place data across several locations and may move it between them, which is why
this says "outside Nepal" rather than naming one country and being wrong the
day it changes.

**If you need to know exactly where your data sits** — a question worth asking
if you hold records about your own customers in one of our products — write to
us and we will tell you, for each system, as it stands on the day you ask.

We also disclose information where the law requires it — to a court, tax
authority, or regulator acting within its powers — and to a professional
adviser bound by confidentiality, such as our accountant or auditor.`,

    `## 5. How long we keep it

- **Accounting and tax records**, including invoices and payment records, are
  kept as long as prevailing Nepali tax law requires — currently at least five
  years from the end of the relevant income year. These we cannot delete on
  request.
- **Account data** is kept while the account is active and for **90 days**
  after closure, and never fewer than **30 days**.
- **Information you hold in a product** (section 3) is kept while your account
  is active. On closure you have at least **30 days** to export it, after which
  it is deleted.
- **Merchant credentials** are deleted when you remove them or when the account
  closes, whichever is first.
- **Contact enquiries** are kept for **24 months**.
- **Technical logs and error reports** are kept for **90 days**.`,

    `## 6. How we protect it

Traffic is encrypted in transit. Administrative accounts require a password and
a time-based one-time code — two-factor authentication is mandatory, not
optional — and the secrets behind those codes are encrypted at rest. Passwords
are stored using a modern password hash, never in a readable form. Merchant
credentials are encrypted at rest under a separate key and are never rendered
back in full, to anyone, including us. Every change to content and every
financial action is written to an audit log.

Files that contain customer information — payment proofs, invoice PDFs, project
documents — are held in private storage reachable only through a short-lived
signed link issued after we check who is asking.

No system is perfectly secure. If a breach affects your information in a way
likely to harm you, we will tell you and the appropriate authority without
undue delay. Where the information affected is information we hold **for you**
under section 3, we will tell you promptly enough that you can tell the people
it is about.`,

    `## 7. Your rights

Under the Individual Privacy Act, 2075 you may ask us to:

- **tell you** what personal information we hold about you;
- **correct** anything inaccurate;
- **delete** information we no longer have a legal reason to keep;
- **stop** using your information for marketing;
- **give you a copy** of what you provided, in a usable format.

Write to the address below. We will respond within **15 days**. If you are not
satisfied, you may complain to the relevant authority or apply to the court
under the Act.`,

    `## 8. Children

Our services are meant for businesses and adults. We do not knowingly collect
information from anyone under 18. If you believe a child has given us personal
information, tell us and we will delete it.

Where one of our products is used by an organisation that serves people under
18, that organisation decides what is collected and is responsible for the
consent behind it — see section 3.`,

    `## 9. Cookies

Our website uses a small number of cookies, described in our Cookie Policy.`,

    `## 10. Changes and contact

This policy is versioned. When it changes we publish a new version with a new
effective date and keep the earlier ones available.

Questions, requests, or complaints about privacy:

${CONTACT_BLOCK}`,
  ),
};

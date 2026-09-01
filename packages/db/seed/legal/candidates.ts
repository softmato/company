import { body, COMPANY, CONTACT_BLOCK, type LegalDocumentSeed } from './shared';

export const candidates: LegalDocumentSeed = {
  slug: 'candidates',
  title: 'Candidate Privacy Notice',
  body: body(
    `This notice explains what ${COMPANY} does with the information you give us
when you apply for a job, an internship, or a training placement. It sits under
our Privacy Policy and, like it, is written to the **Individual Privacy Act,
2075 (2018)**.

It covers applicants only. Once someone joins us, their information is handled
under the terms of their own agreement with us instead.`,

    `## 1. What we collect

**From you:** your name, contact details, CV, portfolio or code samples, links
you choose to share, your education and work history, and anything you write to
us during the process.

**As the process runs:** interview notes, the outcome of any exercise or
technical task, and our reasons for the decision.

**From others, only with your knowledge:** references you name, and — for a
training placement — confirmation of your enrolment from your institution.

**What we do not ask for.** We do not ask for your caste, ethnicity, religion,
marital status, or a photograph, and none of these are used in a decision. If
you volunteer one on your CV, it plays no part. We do not ask for salary slips
from a previous employer, and we do not contact your current employer without
your permission.`,

    `## 2. Why we use it

To assess whether you are right for the role and whether we are right for you:
reading your application, running interviews and exercises, checking references
you named, and telling you the outcome. Where you are offered a place, to
prepare the agreement and the paperwork that follows.

If we think you would fit a different role, now or later, we may keep your
details on file and come back to you. You can say no to that at any time and it
does not affect the application you are making now.`,

    `## 3. Training placements arranged with an institution

Where you come to us through a college or training institute that is paying for
your placement, information moves in both directions and you should know what
goes where.

- Your **institution tells us** you are enrolled, what the placement is meant to
  cover, and who supervises you on their side.
- We **tell your institution** whether you attended, what you worked on, how you
  performed against the placement's objectives, and whether the certificate is
  earned. That reporting is the point of the arrangement and we cannot withhold
  it and still issue the certificate.
- We do **not** share anything beyond that with them — not your personal
  messages, not health information, not anything unrelated to the placement.

The commercial agreement for the placement is between us and your institution.
It does not make them party to anything else about you.`,

    `## 4. Who sees it

Inside the company: the people running the hiring process for that role, and
the founders. Not the whole team.

Outside the company: the referees you name; your institution, in the narrow
case in section 3; our email and file storage providers, listed in the Privacy
Policy; and anyone the law requires us to tell.

**We do not sell candidate information and we do not share it with other
employers or recruiters.**`,

    `## 5. How long we keep it

- **If you are not selected:** we keep your application for **12 months**, so
  we can come back to you about a later role and so we can answer a question
  about a past decision. After that it is deleted. Ask us and we will delete it
  sooner.
- **If you are selected:** your application becomes part of your personnel
  record and is kept under the retention rules that apply to it.
- **Interview notes and exercise submissions** are kept for **12 months** and
  then deleted.
- Code or design work you produced for an exercise stays yours. We do not use
  it in our products or for any client.`,

    `## 6. Your rights

You may ask us to tell you what we hold about you, correct anything wrong,
delete it, or send you a copy. Write to the address below and we will respond
within **15 days**. Asking will never count against an application.`,

    `## 7. What we will never do

- **We never charge you a fee** — not for applying, not for an interview, not
  for a training placement arranged directly with you, and not for a
  certificate. If anyone asks you for money in our name, it is not us: tell us.
- We do not ask you to deposit money, buy equipment, or sign a bond as a
  condition of joining.
- We do not hold your academic certificates, citizenship documents, or passport.
  We may need to see an original to verify it; we give it straight back.
- We do not make hiring decisions on caste, ethnicity, religion, gender,
  disability, or marital status.`,

    `## 8. Contact

Questions about your application or this notice:

${CONTACT_BLOCK}`,
  ),
};

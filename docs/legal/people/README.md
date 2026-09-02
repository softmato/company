# People documents

Templates we hand to a person, not pages we serve. **Nothing in this folder is
published on the website.** The one people-facing document that _is_ public is
the Candidate Privacy Notice, which lives with the other legal documents in
`packages/db/seed/legal/candidates.ts`.

Like the public legal seeds, these are **drafts written for a Nepali software
company, not reviewed by a lawyer**. Every `[confirm: …]` marker is a fact only
the founder knows. Fill them in and have the set reviewed before the first
person signs one.

## Which document for which person

| Who is joining                           | Give them                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Developer, manager, any payroll employee | `employment-agreement.md` + `handbook.md` + `ip-and-confidentiality.md` |
| Intern on a stipend                      | `internship-agreement.md` (Track A) + `ip-and-confidentiality.md`       |
| Unpaid intern                            | `internship-agreement.md` (Track B) + `ip-and-confidentiality.md`       |
| Intern sent by a college or institute    | `internship-agreement.md` (Track C) + `ip-and-confidentiality.md`       |
| The institute paying for that placement  | `training-institution-agreement.md`                                     |

Everyone, without exception, also gets `anti-harassment-policy.md` and
`it-and-device-policy.md`. Everyone leaving goes through
`offboarding-checklist.md`.

**`ip-and-confidentiality.md` is signed by every single person who touches the
code, including unpaid interns.** It is the one document where skipping someone
creates a problem that cannot be fixed afterwards: without it, a person who
wrote part of a product has a claim on it.

## The three intern tracks

They are genuinely different arrangements and the paperwork differs:

- **Track A — stipend.** We pay the intern. Taxable, and closest to employment,
  so the agreement is careful to state what it is not.
- **Track B — unpaid.** Learning-only. The risk is an unpaid intern later
  arguing they were really an employee, so the agreement has to show real
  learning objectives and supervision, and must not have them substituting for
  a paid role.
- **Track C — institution-sponsored.** The institute pays **us** a training fee.
  That makes the institute a paying customer, so there are two instruments: the
  commercial one with the institute, and the personal one with the intern. It
  also means we owe the institute a report and a certificate — see
  `training-institution-agreement.md`.

## Nepali law these are written against

Named so the reader knows where a rule comes from. Where any of these give a
person more than a document here does, **the Act applies and the document
yields** — every template says so, which is why none of them has to restate a
statutory figure exactly.

| Law                                                              | What it governs here                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Labour Act, 2074 (2017)** and Labour Rules, 2075               | Written appointment letters, probation, hours, overtime, leave, notice, termination |
| **Social Security Act, 2074 (2017)**                             | SSF registration and contributions for employees                                    |
| **Sexual Harassment at Workplace (Prevention) Act, 2071 (2014)** | The obligation to _have_ a policy and a complaints mechanism — not optional         |
| **Bonus Act, 2030**                                              | Profit bonus once the company is profitable                                         |
| **Income Tax Act, 2058**                                         | TDS on salary and on stipend                                                        |
| **Individual Privacy Act, 2075 (2018)**                          | Personnel records and candidate data                                                |
| **Copyright Act, 2059**                                          | Ownership of what employees and interns create                                      |

## Before the first person signs

1. Fill every `[confirm: …]` marker — `grep -rn "\[confirm:" docs/legal/people/`
2. Have a Nepali labour lawyer read the set, particularly the unpaid-intern track
3. Confirm SSF registration status before promising a contribution
4. Appoint the person named in `anti-harassment-policy.md` — the policy is
   inert without a real name behind it

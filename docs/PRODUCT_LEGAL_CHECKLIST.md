# Product Legal Checklist

**Read this before launching a new product.** It says what a Softmato product
must publish on its own site to sit under the parent company's policies, and
what it is not allowed to say.

The parent documents live in `packages/db/seed/legal/` and are served at
`softmato.com/legal/<slug>`.

---

## The umbrella rule

Softmato Technology Pvt Ltd is **one legal entity**. Every product — HostelHub,
QuestionCall, whatever comes next — is a brand of that entity, not a separate
company. So:

> A product's terms may **add detail** and may **promise the customer more**.
> They may never promise **less** than the parent documents do. Where a product
> term and a parent term conflict, **the term more favourable to the customer
> applies.**

That sentence is already in the parent Terms of Service, section 1. It is the
whole model in one line: the parent sets the floor, the product builds on it.

The parent site describes products in general terms and does **not** carry
product-specific rules. Those belong on the product's own site, where the
people they apply to actually are.

## The floors a product may not go below

These come from the parent documents. A product may be more generous on any
row. None may be less.

|                                            | Floor set by the parent                                                 | Where      |
| ------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| Invoice payment period                     | Never shorter than **7 days**                                           | Terms §3   |
| Grace before suspension for non-payment    | At least **7 days**                                                     | Terms §5   |
| Data retention after closure or suspension | At least **30 days** (default 90)                                       | Terms §5   |
| Export window after termination            | At least **30 days**                                                    | Terms §10  |
| New-subscription refund window             | At least **7 days**                                                     | Refunds §2 |
| Notice of termination                      | At least **30 days**                                                    | Terms §10  |
| Notice of material change to terms         | At least **14 days**                                                    | Terms §11  |
| Liability cap                              | Never lower than the greater of 3 months' fees or the proposal value    | Terms §8   |
| Confidentiality survival                   | At least **3 years**                                                    | Terms §7   |
| Auto-debit                                 | **Never.** No product may take money without the customer initiating it | Terms §4   |
| Charging the customer's own end users      | **Never** by Softmato. Money moves payer → merchant directly            | Terms §4   |

## What every product must publish

Four documents, minimum, on the product's own domain:

1. **Terms of Service** — the product's own. Must open by naming Softmato
   Technology Pvt Ltd as the operating entity, and must link to the parent
   Terms and state that it sits under them.
2. **Privacy Policy** — must say what the product collects, and must be
   explicit about the **controller/processor split** if the product holds data
   about the customer's own end users. Parent Privacy Policy §3 is the model;
   do not weaken it.
3. **Refund policy** — or an explicit link to the parent one, if the product
   adds nothing.
4. **Contact and grievance route** — a real address and a real email.

Plus, where the product applies:

5. **SLA** — only if it is a paid hosted product. If you publish one, its
   availability target may not be below the parent's **99.5%** and its P1
   response may not be slower than **1 hour**.
6. **Cookie policy** — if the product sets any cookie the parent policy does
   not already describe.

## What a product must decide for itself

The parent cannot answer these; write them into the product's own terms.

- **Who the customer is** — a business, a consumer, or both. It changes what
  the Consumer Protection Act, 2075 requires of you.
- **End users.** Does the product hold data about people who are not your
  customer (residents, students, patients)? If so, the controller/processor
  section is mandatory, not optional, and you must say what happens to that
  data when the customer leaves.
- **Money flow.** Does the customer pay you, or do the customer's own users pay
  the customer through the product? If the latter, copy the structure of parent
  Terms §4 — merchant credentials, direct settlement, refunds are the
  merchant's job, not ours.
- **Age.** Will anyone under 18 use it? If yes, you need a consent model, and
  parent Privacy Policy §8 alone will not cover you.
- **Sector rules.** Hostels, schools, and clinics carry their own regulatory
  baggage. Check before launch, not after.
- **Data location.** Name where the product's data actually sits.

## What a product may never do

- Publish terms that contradict a floor above
- Claim to be a separate company, or imply a corporate group that does not exist
- Hold customers' money, or route it through a Softmato account
- Auto-debit anyone
- Charge a customer's end users a Softmato fee
- Say the product is VAT-registered while the company is not
- Copy the parent documents wholesale and change the name — the `[confirm: …]`
  markers will come with them and end up published

## Before launch

- [ ] Product Terms drafted, link back to parent Terms, and state the umbrella rule
- [ ] Every floor in the table above checked, one by one
- [ ] Product Privacy Policy drafted, with the controller/processor split if needed
- [ ] Refund position stated, or the parent policy linked
- [ ] SLA published only if it is a paid hosted product, and within the parent's numbers
- [ ] Contact block filled with a real address and email
- [ ] **No `[confirm: …]` marker anywhere in the published text** —
      `grep -rn "\[confirm:"` the product's content before it goes live
- [ ] No draft banner left at the top of any document
- [ ] Effective date set on every document
- [ ] Parent site's product page updated, in general terms only, with no
      product-specific rules restated there
- [ ] Reviewed by a lawyer, along with the parent set

## Where the parent documents are

| Document                 | File                                   |
| ------------------------ | -------------------------------------- |
| Terms of Service         | `packages/db/seed/legal/terms.ts`      |
| Privacy Policy           | `packages/db/seed/legal/privacy.ts`    |
| Refund & Cancellation    | `packages/db/seed/legal/refunds.ts`    |
| Service Level Agreement  | `packages/db/seed/legal/sla.ts`        |
| Acceptable Use Policy    | `packages/db/seed/legal/aup.ts`        |
| Cookie Policy            | `packages/db/seed/legal/cookies.ts`    |
| Candidate Privacy Notice | `packages/db/seed/legal/candidates.ts` |

Shared scaffolding, the draft banner, and the contact block:
`packages/db/seed/legal/shared.ts`.

People-side templates, which are **not published**: `docs/legal/people/`.

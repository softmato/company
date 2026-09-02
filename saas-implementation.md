# Onboarding a SaaS onto Softmato

Working notes, not a specification. This file exists so the next session can
pick up the argument rather than restart it. Written 2026-09-02, after the
document layer and the renewal recommendations landed.

**Append to this file. Do not rewrite it.** The disagreements recorded here are
worth more than a tidy summary of the conclusion.

---

## 1. What is actually built today

The money path is complete and has been through real sandbox payments on both
eSewa and Khalti. What a SaaS can do right now, with no further work on our
side:

1. Ask for an invoice — customer, lines, amounts in integer paisa, optionally a
   `presentation` block describing the plan in its own words.
2. Get a checkout session and send the customer to it. **There is no amount
   parameter**; the server reads it from the invoice.
3. Receive `payment.success` on a signed webhook, retried until answered.
4. Read the invoice and the receipt back as JSON, HTML or PDF, scoped to itself.

The documents are real: numbered, in the ledger, party details frozen at issue,
rendered once and stored, PDF attached to the receipt email.

### What is deliberately not built

- **No pre-payment email to the customer.** Only the receipt, after money
  arrives. The reasoning is in `docs/INTEGRATION.md` §1 and is settled: it is
  the SaaS's customer and the SaaS's brand, and two companies writing to
  someone about money they have not yet paid is confusing at best.
- **No subscription engine.** The `subscriptions` table exists, with
  `current_period_end`, a 7-day default grace and an index built for finding
  renewals — and nothing writes to it. See §3 below; this is a live decision,
  not an oversight.
- **No self-service registration.** Applications and their secrets are created
  by hand, by us. See §4.

---

## 2. The renewal shape, settled 2026-09-02

Recorded in `docs/INTEGRATION.md` §5 as a recommendation from us to every SaaS
billing under our rails.

**7 before, 7 grace.** Raise the renewal invoice 7 days before the period
starts; `due_at` is the day it starts; 7 days of grace after that before
suspending. Two weeks of runway, and nobody loses service on a day they did not
expect.

Seven for a concrete reason, not by taste: **Nepali wallets have no
auto-debit.** Nobody can charge a saved instrument on the customer's behalf —
they must open a wallet and act. Notice is therefore the collection mechanism,
not a courtesy.

**Bill early, collect on click.** An invoice can be dated whenever you like. A
checkout session lives 30 minutes and is closer to a cheque than to a link — it
must be created when the customer presses Pay, every time, including retries.

**`external_ref` must contain the period.** This is the one item we phrase as a
rule rather than advice. A nightly job will run twice eventually; a
period-keyed reference makes the second run a lookup instead of a second
invoice. `sub_123:2083-09`, never `renewal-${Date.now()}`.

**Emails either side of the payment are the SaaS's.** They ask us for the
invoice over the API and attach our PDF, so the customer sees one sender and
one document.

---

## 3. Open: who drives renewals

Two models, and the platform has to pick one before a second SaaS arrives.

**SaaS-driven (what the docs now recommend).** The SaaS knows its plans and its
customers, runs its own nightly job, raises the invoice, sends its own notices.
Softmato is the billing and payment rail underneath. Works today with no new
code.

**Platform-driven (what the schema was designed for).** A SaaS registers a
subscription once — plan, price, interval — and we generate the renewal invoice
every period and drive the reminders. The `subscriptions` table's own comment
says this was the intent: _"The engine generates renewal invoices and
reminders; the customer initiates each payment."_

**Current recommendation: SaaS-driven, for now.** With one integrator, a
subscription engine is a lot of machinery to serve a caller that already knows
its own plans better than we do. Build it when the second SaaS makes us write
the same job twice — the table is already there and costs nothing to leave
empty.

**What would change the answer:** a second SaaS; or a support burden that turns
out to be ours anyway (customers ringing Softmato about a HostelHub renewal);
or a decision that renewal reliability is a thing we sell rather than a thing
they implement.

---

## 4. Open: how a SaaS gets credentials

Today: by hand. `pnpm app:secret -- --client-id <id>` rotates and prints a
client secret — the only way to obtain a usable one, since secrets are
argon2id-hashed at issue and never recoverable. The webhook secret is separate,
stored in plaintext, and printed by `pnpm webhook:status -- --reveal`. Two
different credentials; neither works in the other's place.

That is fine for one integrator and does not scale to ten.

### The question to settle

**Self-registration, or issuance?** Three shapes, in increasing order of how
much we are trusting a stranger:

1. **We issue, always.** A SaaS asks, a human at Softmato creates the
   application and hands over the secret once. Slow, and every credential has a
   person's judgement behind it. This is today.
2. **They register, we approve.** A signup form creates the application in a
   `pending` state with no live scope; sandbox credentials work immediately, and
   live credentials need a human. Fast for developers, and the gate is where the
   money is.
3. **They register, fully self-service.** Sandbox and live both automatic.
   Fastest, and it means a stranger can start sending real customers to a real
   payment page under our name, with our PAN on the invoice, before anyone has
   looked at them.

**Leaning towards (2).** The thing being protected is not the API — it is that
Softmato's legal name, PAN and bank details appear on a statutory document
issued to somebody else's customer. Sandbox has none of that exposure; live has
all of it. Putting the human exactly on that boundary costs a developer nothing
and gives us the one review that matters.

Unresolved either way:

- Does an application belong to a **product** (as the schema has it today) or to
  an **account** that could own several products?
- Who may rotate a secret — anyone holding the current one, or only through us?
- What happens to in-flight payments when a SaaS is suspended?
- Is there a per-application rate limit, and what is it?

---

## 5. Open: where the standards live, and what makes them binding

The recommendations in `docs/INTEGRATION.md` are advice in a how-to guide.
**You cannot make something compulsory in a how-to guide** — a developer who
skips a section has broken nothing they agreed to.

So the two halves want separating:

|                                                                                                   | Where                                 | Binding?    |
| ------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| **How to integrate well** — the 7/7 shape, the reference key, what to do while an invoice is open | `docs/INTEGRATION.md` §5              | Recommended |
| **What a SaaS agrees to by holding live credentials**                                             | A published page, dated and versioned | Binding     |

### Naming the public page

The footer already carries the legal set (`/legal/aup`, `/legal/cookies`, …),
CMS-managed, so a new slug there is a content change rather than a build.

**Recommendation: `/legal/partner-terms`, linked in the footer as "Partner
Terms".** Reasoning:

- _"SaaS policy"_ is jargon in a footer. The person clicking it is either a
  prospective integrator or a customer checking who they are paying; "partner"
  reads correctly to both.
- It belongs beside the other legal documents because it is the same kind of
  thing — dated, versioned, agreed to — and because that is where a reader
  already looks for it.
- It leaves `INTEGRATION.md` free to stay a friendly guide, which is what makes
  it get read.

What goes in it, as a first cut — all of it enforceable, none of it advice:

- Accurate invoice contents. What the customer is billed for must be what they
  bought; `presentation` may not contradict the amount.
- No credential sharing, no sub-integration under one application.
- Provision on `payment.success` or a verified `getTransaction`, never on the
  existence of an invoice or on a return URL's query parameters.
- Verify webhook signatures before reading any field.
- Notify the customer before charging a renewal, and honour a cancellation.
- Handle refunds and disputes through us; do not settle out-of-band and tell
  us afterwards.
- Data: what a SaaS may keep from our responses, and for how long.
- Suspension: what breaches cost credentials, and with what notice.

**Open:** who writes it. This is a legal document about liability between two
companies, and none of the above is legal advice. The engineering side can
draft the technical clauses; the rest needs the founder, and probably a lawyer.

---

## 6. What to pick up next session

1. Wire HostelHub — the first integrator, and the test of whether
   `INTEGRATION.md` is actually sufficient to build against without asking us
   anything. Note what has to be asked; each question is a documentation bug.
2. Decide §4 (credential issuance) — it blocks any second SaaS.
3. Draft the technical half of `/legal/partner-terms` from §5, and hand the
   commercial half to the founder.
4. Revisit §3 (who drives renewals) only when a second SaaS exists.

---

## 7. Settled 2026-09-02, in the security hardening session

**Appended, not rewritten.** §4 and §5 above are left as they were written —
they record what was open at the time, and overwriting them would lose the
reasoning that got here.

### §4 — how a SaaS gets credentials: **settled as deferred**

Self-service registration is not built, and the reason is accounting rather
than engineering.

`applications.product_id` points at `products`, which holds exactly Softmato's
own product lines. `docs/CHART_OF_ACCOUNTS.md` §8 calls it a ledger dimension —
it is what makes per-product P&L work — and §9.1 posts an issued invoice as
`Dr 1110 AR / Cr 2110 Deferred Revenue`: _Softmato's_ receivable, _Softmato's_
obligation, _Softmato's_ PAN. There is no partner payable anywhere in the
liabilities section. So money collected for a genuine outside company would be
booked as our revenue with nowhere to record what we owe them.

**Every application is a Softmato product by construction.** That is not a gap
to close before launch; it is the shape of the chart of accounts. Recorded as
`future_implementation.md` §2, blocked on a partner payable account, a
revenue-share model, and a decision about whose PAN goes on the invoice.

What _is_ built, and would be the same work whoever performs it: registration,
both secrets, the domain allowlist, rotation, revocation and an audit row for
each — all at `/admin/applications`, by a signed-in admin, with
re-authentication before a live credential is minted. What is missing is the
ledger, not the form.

### §5 — where the standards live: **two pages, and the line between them**

- **`/developers`** — the engineering contract, rendered from
  `docs/INTEGRATION.md` **in git**, at build time. Also served as
  `developer.softmato.com`, which is a middleware rewrite onto the same route
  rather than a second application. Not in the CMS, deliberately: documentation
  that describes code is only correct while it matches that code, and the moment
  a non-engineer can edit it without editing the code, it drifts.
- **`/legal/partner-terms`** — the same rules as a legal document, seeded
  `draft` with no effective date. Its technical clauses are _descriptions_ of
  enforced behaviour, not promises. Its commercial half is a `[confirm: …]`
  block, which keeps the page out of search engines and blocks the deploy until
  a lawyer fills it in.

Each links to the other. The engineering page is the one an integrator reads;
the legal page is the one that makes it binding.

### What makes it binding is code, not prose

The clauses that matter are enforced before they are written down:

| Clause                                             | Enforced by                                |
| -------------------------------------------------- | ------------------------------------------ |
| Return and webhook addresses registered in advance | `assertRegisteredHost`                     |
| No wildcards; exact hostname match                 | `application_domains` CHECK + SQL equality |
| Provision on a verified payment only               | no status in any URL we hand a customer    |
| Verify the signature before reading a field        | the delivery signer                        |
| 24-hour rotation overlap                           | `rotateSecret`                             |

A term nobody can violate without getting an error is worth more than a term
nobody reads.

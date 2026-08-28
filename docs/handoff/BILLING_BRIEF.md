# Softmato — billing & finance brief

**Audience:** an assistant or engineer working on a Softmato SaaS product who
needs to understand how billing works here, without reading the whole `docs/`
folder. Everything below is condensed from `PRD.md`, `ARCHITECTURE.md`,
`API.md`, `RULES.md`, `DATABASE.md` and `CHART_OF_ACCOUNTS.md`. Where a detail
matters, the source section is named — go there before writing code.

---

## 1. The company shape (this drives every decision)

- **Softmato Technology Pvt Ltd**, Kathmandu. One legal entity. HostelHub,
  QuestionCall and anything that follows are **brands, not subsidiaries**.
- Softmato collects **its own revenue** from business customers. It never holds
  or routes money belonging to a third party. HostelHub is sold to hostel
  owners; a hostel's students never pay through this system.
- **PAN-registered, not VAT-registered.** No VAT on invoices, no IRD CBMS.
  Annual turnover is tracked so the VAT threshold is seen coming.
- Fiscal year **Shrawan 1 – Ashad end** (Bikram Sambat). Currency **NPR only**.
- Because there is one entity, **there is no inter-company platform fee.** A
  fee charged from one product to another nets to zero. Per-product profit is
  reported through a `product_id` dimension on ledger lines, never through
  internal invoicing.

That last point is the usual difference from other SaaS billing writeups: this
is not Stripe Connect, not a marketplace, not a payment facilitator. It is one
company's own till, shared by its own products.

---

## 2. Why a product talks to the parent platform at all

The problem it replaces: a customer scanned a static QR, sent a screenshot, a
founder opened the eSewa app and verified by hand, then flipped a flag. No audit
trail, no books, no revenue-per-product — and every new SaaS would need its own
eSewa and Khalti integration, credentials and reconciliation.

```
✗  HostelHub ──────▶ eSewa
   QuestionCall ───▶ Khalti

✓  HostelHub ─────┐
   QuestionCall ──┼──▶ Central Payment API ──▶ providers
   SaaS-3 ────────┘
```

**The central principle** (`ARCHITECTURE.md` §2): a SaaS product must never
contain eSewa logic, Khalti logic, provider credentials, signature code,
provider webhook handling, or reconciliation. All of that — plus fees, refunds
and every journal entry — lives in the central platform.

What a product implements, and nothing more:

1. create an invoice,
2. request a checkout session,
3. redirect the customer,
4. receive a signed webhook,
5. update its own entitlement.

Adding a fifth SaaS means issuing credentials, not writing another gateway
integration. Target from `PRD.md` §6: a product integrates **in under a day
using `API.md` alone**, and never reads a provider's documentation.

---

## 3. The integration contract

Base `https://api.payment.softmato.com/v1`. JSON in, JSON out.
**Amounts are integers in paisa** — `500000` is NPR 5,000. Timestamps ISO 8601
UTC. Every request carries `Authorization: Bearer <client_secret>`; every
mutating request carries an `Idempotency-Key`.

Each product gets a `client_id` and a secret (argon2id-hashed, shown once at
issue, 24-hour overlap on rotation, immediate revocation). Scopes:
`payment:create`, `payment:read`, `invoice:create`, `invoice:read`,
`refund:request`, `customer:read`. **Never granted to a product:** refund
approval, accounting access, cross-product reads, provider configuration,
anything admin.

### Step 1 — `POST /v1/invoices` (scope `invoice:create`)

Send the customer, the lines, and — for a subscription — `service_starts_at` /
`service_ends_at`, which are what drive deferred revenue on our side.
`external_ref` is unique per application; repeating it returns the existing
invoice rather than a duplicate.

### Step 2 — `POST /v1/checkout` (scope `payment:create`)

```json
{
  "invoice_id": "inv_01J...",
  "return_url": "https://hostelhub.com/billing/return",
  "metadata": { "subscription_id": "sub_123" }
}
```

**There is no `amount` field.** The server reads the amount from the invoice; a
client-supplied amount would be a vulnerability. Response:

```json
{
  "session_id": "cs_live_8f7d92a1...",
  "checkout_url": "https://payment.softmato.com/checkout/cs_live_8f7d92a1...",
  "expires_at": "2026-08-12T11:00:00Z",
  "allowed_providers": ["fonepay", "esewa", "khalti"]
}
```

Server order of operations: authenticate → check scope → validate → verify
invoice ownership → recompute the amount → compute `allowed_providers` **by
amount** → create the session (32+ bytes of entropy, 30-minute expiry).

`allowed_providers` is computed per session, never static (`API.md` §8):
wallets have per-transaction limits, and a customer must never be offered a
method that will fail mid-payment. A provider without live credentials is
`is_active = false` and is not offered at all. Order is Fonepay (10), eSewa
(20), Khalti (30) — Fonepay is primary because it reaches banks, not one
wallet's customers.

### Step 3 — redirect, and then wait

The product redirects the customer to `checkout_url` and **does nothing else**.
It does not poll a provider, does not read the return URL's query string, and
does not mark anything paid.

### Step 4 — the success callback (`API.md` §4)

```
POST <application.webhook_url>
X-Softmato-Signature: <hex hmac-sha256 of "{timestamp}.{body}">
X-Softmato-Timestamp: 1754990400
```

```json
{
  "event": "payment.success",
  "transaction_id": "TXN-2082/83-00000001",
  "invoice_id": "HH-2026-00123",
  "amount": 1200000,
  "currency": "NPR",
  "status": "SUCCESS",
  "occurred_at": "2026-08-12T10:30:00Z"
}
```

Events: `payment.created`, `payment.pending`, `payment.success`,
`payment.failed`, `payment.cancelled`, `payment.expired`,
`payment.refund_created`, `payment.refunded`, `payment.partially_refunded`.

The consumer **must** verify the signature with `crypto.timingSafeEqual` and
reject timestamps older than 5 minutes. Delivery is via QStash with exponential
backoff; after 8 failures the delivery is `abandoned` and an admin is alerted.
Any delivery is replayable from the admin panel — so a consumer must also be
idempotent on `transaction_id`.

If a product ever needs to ask rather than wait: `GET /v1/transactions/:id`
(scope `payment:read`), scoped to its own application. That is the endpoint that
answers "is TXN-123 paid?" — the product never decides for itself.

Refunds: `POST /v1/refunds` creates a **request only**. Approval happens in the
admin panel, by a human, and a product can never approve one.

---

## 4. Why the callback exists, and why a redirect is not it

This is the part most integrations get wrong, so it is a hard rule
(`RULES.md` §2.3): **a redirect is never proof of payment.** A customer typing
`?status=Completed` into the return URL must achieve exactly nothing. Only a
signature-verified callback or an authenticated server-side lookup can move a
payment to succeeded.

Two confirmation paths, one outcome (`ARCHITECTURE.md` §3):

- **eSewa** POSTs a signed callback. The handler must be fast — read raw body,
  verify signature, `INSERT` into `provider_events` (a unique constraint dedupes
  replays), enqueue to QStash, return 200, all under 200ms. Never process
  inline; providers time out and resend.
- **Khalti does not push webhooks at all.** Confirmation is redirect-then-lookup
  plus a polling job. The redirect only *triggers* a lookup; its query string is
  ignored.
- `poll()` is **mandatory for every provider** and runs every minute against
  transactions in `created` / `pending`. It is the universal safety net.

Both paths converge on the same verification code, which compares the provider's
amount against ours. On a match, one database transaction does all of this or
none of it:

```
SELECT ... FOR UPDATE the transaction
already succeeded? -> return (idempotent no-op)
amount mismatch?   -> reconciliation_required, alert, STOP - nothing posts
update transaction (status, fee, net, provider_txn_id, succeeded_at)
postJournal(...)                    <- CHART_OF_ACCOUNTS.md §9.2
store journal_id on the transaction
update invoice paid_minor and status
insert webhook_deliveries row       <- this is the callback the product receives
insert audit_logs row
COMMIT
```

So a product's success callback is not a notification bolted on afterwards — it
is emitted from the same transaction that posted the money to the ledger. If the
journal does not balance, the database rejects the commit and no callback is ever
queued. **The webhook a product receives is backed by a balanced journal entry,
by construction.**

Transaction states: `created`, `pending`, `succeeded`, `failed`, `cancelled`,
`expired`, `partially_refunded`, `refunded`, `reversed`,
`reconciliation_required`.

**Receipts are a separate audience** (`API.md` §9). A confirmed payment emails a
receipt to *the payer* — the person whose money moved. The *product* learns about
it from the webhook. Different audiences, different messages. The receipt number
is `txn_no` (already gapless per fiscal year); there is no receipts table. The
receipt shows the **gross**, never the net — the provider's fee is our cost, not
a deduction from what the customer paid. Sending a receipt can never fail a
payment, and a payer with no email address is normal, not an error.

---

## 5. What happens to the money on our side

Double-entry, append-only, enforced by PostgreSQL rather than by application
code. All money is `BIGINT` in **paisa** — never `number`, never `float`, never
`NUMERIC`. Every ledger line carries an optional `product_id` (`hostelhub`,
`questioncall`, `agency`, `corporate`) so per-product P&L needs no extra
accounts.

The posting rules that matter for billing (`CHART_OF_ACCOUNTS.md` §9,
illustrative NPR 12,000 annual subscription):

| Event                                     | Entry                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Subscription invoice issued               | Dr `1110` AR — SaaS 12,000 / Cr `2110` Deferred Revenue 12,000                      |
| Payment verified via Khalti, fee 240      | Dr `1032` Khalti Wallet 11,760 + Dr `5010` Provider Fees 240 / Cr `1110` AR 12,000  |
| Month end, revenue recognition            | Dr `2110` Deferred Revenue 1,000 / Cr `4010` SaaS Revenue 1,000                     |
| Provider settles to bank                  | Dr `1020` Bank 11,760 / Cr `1032` Khalti Wallet 11,760                              |
| Refund, 9 months unearned                 | Dr `2110` Deferred Revenue 3,000 / Cr `1032` Khalti Wallet 3,000                    |
| Agency invoice, client withholds 1.5% TDS | Dr `1020` Bank 98,500 + Dr `1210` Advance Tax — TDS 1,500 / Cr `1120` AR 100,000    |

Four things behind that table are worth stating plainly:

1. **Invoicing a year up front earns nothing.** NPR 12,000 collected is NPR
   12,000 owed as twelve months of service, released NPR 1,000 at a time.
   Account `2110` is what makes SaaS accounting correct here; skipping it
   overstates revenue and distorts every month's P&L.
2. **Provider wallets are their own asset accounts** (`1031` eSewa, `1032`
   Khalti, `1033` Fonepay settlement). Money in a merchant wallet is yours but
   not yet in your bank. Keeping it distinct is what makes reconciliation
   possible: `1032` must equal what Khalti says you hold.
3. **Never compute a provider fee** when the provider returns one. Khalti's
   lookup response includes `fee` — capture it. `5010` is tagged by product, so
   "which SaaS is expensive to collect for?" is answerable.
4. **TDS** (`1210`): Nepali business customers withhold ~1.5% on service payments
   and pay the net. That withheld amount is tax already paid on your behalf.
   Untracked per invoice, the deduction is lost.

Revenue is **not** split per product in the chart of accounts — HostelHub and
QuestionCall both post to `4010` with a `product_id` tag. Adding a product is a
row insert; it never touches the chart of accounts.

**Corrections:** never edit a posted entry. Post a reversal with
`reverses_journal_id`, then post the correct entry. Both stay visible.

---

## 6. The guarantees the database enforces

These are the reason the stack is PostgreSQL (`DATABASE.md` §2), and they are the
honest answer to "can I trust the callback?":

- A journal **cannot commit unbalanced** — a deferrable constraint trigger at
  COMMIT, per currency. It also rejects a journal with no lines.
- Ledger rows are **immutable** — `UPDATE` and `DELETE` both fail. Same for
  `audit_logs` and `provider_events`.
- **Closed periods reject postings** — a `BEFORE INSERT` trigger; only a
  `period_close` journal gets through.
- **An admin cannot exist without 2FA** — `CHECK (NOT is_active OR totp_enabled)`.
- `UNIQUE (provider_id, provider_ref)` and `(provider_id, provider_txn_id)` on
  transactions — the **anti-double-credit guard**. A retried webhook, a duplicated
  poll result, or a race between the callback and the poll job cannot create a
  second transaction. The database refuses.
- `succeeded_needs_journal` — a successful transaction without ledger entries is
  **not representable**.
- `net_consistent` — `net = gross − provider_fee`.

If a constraint blocks a write, the code is wrong. Weakening one is never the fix
(`RULES.md` §3).

---

## 7. Finance operations around the billing flow

- **Reconciliation** (`CHART_OF_ACCOUNTS.md` §10): each provider balance account
  ties to an external source — eSewa/Khalti merchant dashboards, Fonepay bank
  settlement advice, bank statement for `1020`. A mismatch sets the period to
  `RECONCILIATION_REQUIRED` and blocks close. **Never auto-resolve one.**
- **Subscriptions:** renewal invoices, reminders at 7/3/1 days, grace, then
  suspension. **No auto-debit** — Nepali wallets have no reliable
  server-initiated charge, so the customer initiates every payment. A stored
  mandate table exists and is unused.
- **Background jobs** (`ARCHITECTURE.md` §6), all under `/api/jobs/*` behind a
  `CRON_SECRET`: poll pending transactions (1 min), expire stale sessions, retry
  webhooks, recognise revenue (monthly), generate renewal invoices, send dunning,
  suspend past grace, reconcile providers (daily), heartbeat. **Every job queries
  by state, never "what changed since the last run"** — a missed run is caught by
  the next one.
- **Reporting:** trial balance, P&L, balance sheet, general ledger, AR aging,
  product-level P&L, period close. The founder-facing goal is answering "what did
  HostelHub earn last month, net of fees?" in two clicks.

---

## 8. Rules an assistant must not break

From `RULES.md` — these pass a happy-path test and are still defects:

- Marking an invoice paid from a redirect parameter
- Storing money as `number` or `float`, or a `paid: boolean` instead of the
  status enum
- Computing a provider fee as a percentage when the API returns it
- `UPDATE`ing a ledger row to fix a mistake
- Processing a provider callback inline instead of enqueueing
- Trusting a client-supplied amount
- A cron job that depends on the previous run having succeeded
- Any provider secret reaching a browser
- Auto-resolving a reconciliation mismatch
- Loosening a database constraint to make a test pass
- Catching and ignoring an error in a payment path
- Comparing secrets with `===` instead of `crypto.timingSafeEqual`
- Filtering a tenant query by a URL parameter

And one process rule: **never improvise a journal entry.** If a posting rule is
not in `CHART_OF_ACCOUNTS.md` §9, stop and ask the founder.

---

## 9. Where this actually stands (as of 2026-08-16)

Be careful quoting capability as if it were live:

- **Phase 1 accepted** — ledger, constraints, auth with mandatory TOTP, audit
  logging, subdomain routing.
- **Phase 2 in progress** — public site and CMS built; content written but **not
  published**, and the sender domain was still being sorted.
- **Phase 3 in progress** — `payment-core` foundations built and enforced, but
  **no payment path is open yet.**
- `manual_qr` was **removed on 2026-08-16**. It was the only provider needing no
  external credentials, so until Fonepay, eSewa or Khalti has both credentials
  and an adapter, `allowed_providers` comes back empty and checkout refuses every
  session. There is also **no fallback when a gateway is down** — that was
  `manual_qr`'s other job.
- Khalti (Phase 4), eSewa (Phase 5), invoicing and subscriptions (Phase 6),
  accounting depth (Phase 7), client portal (Phase 8) and Fonepay (Phase 9) are
  still ahead. Fonepay is gated on bank credentials — **do not guess at its
  request shapes.**
- The chart of accounts is a **working draft pending a licensed accountant's
  sign-off**; revenue recognition policy, depreciation, TDS rates, setup-fee
  treatment and opening balances are open questions in
  `CHART_OF_ACCOUNTS.md` §11.

---

## 10. Reading order if more depth is needed

`PRD.md` (what and why) → `ARCHITECTURE.md` (shape and flow) → `RULES.md` (hard
boundaries) → `API.md` (the integration contract and provider specs) →
`CHART_OF_ACCOUNTS.md` (every posting rule) → `DATABASE.md` and `schema.sql`
(the guarantees) → `MEMORY.md` (running state, always current).

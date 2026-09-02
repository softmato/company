# Phase 3 completion — wiring the payment engine

**Written 2026-09-01 (session 12), replacing the previous tracker** (archived at
`docs/handoff/todo-superseded-2026-09-01.md`). The old one marked most of this
done. It was not. Every claim below was checked against the code.

---

## The situation in one paragraph

`packages/payment-core` is built and it is good — sessions, both state
machines, idempotency, `startPayment`, `completePayment`, journal posting,
receipts, invoice clearing. **Nothing in `apps/web` calls any of it.** The
engine has no ignition. On top of that, the four provider adapters (commit
`65d324e`) were written against guessed API shapes and contain defects that
book money nobody paid. Those come out before anything is wired to them.

**Do not treat this as a UI task.** This is the money path of the parent
company. The order below is deliberate: correctness first, then wiring, then
surfaces.

---

## What can actually be tested, and what cannot

| Provider | Sandbox | Status |
| --- | --- | --- |
| **eSewa** | Yes — `EPAYTEST` / `8gBm/:&EnhH.1/q`, verified against rc-epay on 2026-09-02 | **Wired and proven as far as the gateway.** See §9. |
| **Khalti** | Yes — Khalti publishes a shared test key, `live_secret_key_68791341fdd94846a146f0457ff7b455` | **Wired and proven as far as the gateway.** See §9. |
| **Fonepay** | **No.** No bank integration document, no sandbox, no merchant ID. | **Left exactly as it is** — an honest stub that throws. Rebuilt in Phase 9 when the bank's document arrives. Do not code around it in the meantime. |
| **Mock** | n/a — deterministic, offline | Testable, and the only thing that may ever fake a success. |

**The key in the first row is not the one this repo recorded until 2026-09-02.**
Three different wrong eSewa secrets were in the tree — `8gBwcE4DOHB28vvi` in
`.env.example` and both adapter tests, and `LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==`
in `docs/ENVIRONMENT.md` (under `ESEWA_PRODUCT_CODE`, a variable name the code
has never read). All three are corrected. See §9.1.

This means **Phase 3 acceptance criteria 2, 3 and 4 are reachable now** without
waiting on the founder. `PHASES.md` says they need live credentials; that was
written before the eSewa sandbox was confirmed usable. Sandbox satisfies them.

---

## §0 — Fix the adapters before wiring anything to them

Blocking. Each of these ships money-fabricating behaviour today.

- [x] **0.1 — Delete every "no credentials → succeeded" fallback.**
  Three adapters silently return a *successful payment for the exact expected
  amount* when their secret key is missing. That result passes
  `completePayment`'s amount check and **posts a real journal entry crediting
  revenue for money nobody sent.**
  - `khalti.ts:112` — `if (!this.config.secretKey || pidx.startsWith('khalti_mock_'))` returns `succeeded`. `KHALTI_SECRET_KEY` is empty in `.env.example` right now.
  - `fonepay.ts:82` — `if (!this.config.secretKey || prn.startsWith('FP_') || this.config.isSandbox)`. **`initiate()` always mints a PRN beginning `FP_`, so this branch is unconditional.** Every Fonepay poll returns success, forever.
  - `khalti.ts:56` — `initiate()` returns a fake `redirectUrl` with `status=Completed` baked in.
  A missing credential must **throw**. Faking success is what `MockProviderAdapter` and `PAYMENT_MODE=sandbox` exist for.

- [x] **0.2 — eSewa `handleCallback` does not verify the signature.**
  `esewa.ts:163-190` base64-decodes the payload, reads `decoded.signature`, and
  **never checks it.** Anyone who can POST to the callback can forge
  `status: COMPLETE` at any amount. Verify HMAC-SHA256 over
  `signed_field_names` **before** any other field is read, and reject on
  mismatch. This is Phase 5 acceptance 2 and the most serious defect in the tree.

- [x] **0.3 — Stop hardcoding secrets as fallbacks.**
  `esewa.ts:34` and `esewa.ts:53` fall back to the literal sandbox key
  `'8gBwcE4DOHB28vvi'`; `fonepay.ts:31-32` to `'fonepay_secret_key_mock'`.
  In live mode with an unset env var these sign with a public test key rather
  than failing. Read credentials once, at construction, and throw when absent.

- [x] **0.4 — Reduce the Fonepay adapter to an honest stub.**
  It is guessed end to end: an invented `/pg/redirect` shape, an invented
  `/merchant/lookup`, an invented HMAC-SHA512 field order, and a **fabricated
  EMVCo QR payload** whose CRC is the first four characters of an HMAC
  (`fonepay.ts:68`). `PHASES.md` Phase 9: *"Do not guess at Fonepay request
  shapes. Ask."* Replace the body with `PROVIDER_UNAVAILABLE` throws behind
  `FONEPAY_ENABLED=false`, keep the class so the registry shape holds, and
  rebuild it in Phase 9 against the bank's document. Keeping a plausible-looking
  guess is worse than having nothing, because it looks finished.

- [x] **0.5 — Never map an unknown provider status to `pending`.**
  All three use `statusMap[data.status] || 'pending'`. An unrecognised status on
  a money path is an error, not a guess — it hides `NOT_FOUND` and `AMBIGUOUS`
  from eSewa and `Partially refunded` from Khalti. Throw on unknown.

- [x] **0.6 — Fix eSewa's amount parsing.**
  `BigInt(Math.round(parseFloat(decoded.total_amount) * 100))` (`esewa.ts:184`).
  eSewa returns thousands separators — `parseFloat("1,000.0")` is `1`, a
  **1000× understatement**. Strip separators and parse to minor units without
  float multiplication.

- [x] **0.7 — Fix `transaction_uuid` format.**
  `${session.id}_${Date.now()}` (`esewa.ts:59`). eSewa rejects underscores;
  only alphanumerics and hyphens are accepted. This alone would fail every real
  sandbox call.

- [x] **0.8 — Remove the fake `refund()` implementations.**
  `esewa.ts:203` and `fonepay.ts:139` return `status: 'succeeded'` without
  contacting anyone. A refund that reports success posts reversing entries for
  money that was never returned. `refund` is optional on `ProviderAdapter` —
  leave it off until it is real. Khalti's (`khalti.ts:196`) derives status from
  `response.ok` rather than the body; fix or drop it.

- [x] **0.9 — Fix the `MockProviderAdapter` identity collision.**
  `mock.ts:17` hardcodes `readonly id = 'khalti'`, so it cannot be registered
  alongside the real Khalti adapter — `registerProvider` throws on the second.
  The mock must take its id at construction.

- [x] **0.10 — Rewrite `tests/providers-sandbox.test.ts`.**
  It currently **asserts the bugs**: `expect(status.status).toBe('succeeded')`
  against credential-less Khalti and Fonepay polls. It is green and it is
  guarding the defects. Replace with tests that assert a missing credential
  throws, a forged signature is rejected, and `"1,000.00"` parses to `100000n`.

---

## §1 — Composition root

- [x] **1.1** One module that calls `registerProvider()` for each adapter the
  environment enables, imported once on the server. `registerProvider` is
  currently called **nowhere in `apps/web`**, so the registry is empty at
  runtime and `providerAdapter()` throws for every provider.
- [x] **1.2** Select adapters by `PAYMENT_MODE`: `mock` registers
  `MockProviderAdapter` under each id; `sandbox`/`live` register the real ones.
  Fonepay stays unregistered until §0.4 is reversed in Phase 9.
- [x] **1.3** Validate payment env vars in `lib/env.ts` at boot, so a missing
  key fails the deploy rather than the first payment.

---

## §2 — The real checkout page

- [x] **2.1** `app/(checkout)/checkout/[sessionId]/page.tsx` is **hardcoded
  fake data** — `"Himalayan Tech Pvt Ltd"`, `INV-2083/84-00000001`,
  `2500000n`, all inline props. It never calls `loadSession`. Replace with a
  real `loadPayableSession` read.
- [x] **2.2** Handle expiry, already-paid and cancelled sessions as distinct
  states rather than rendering a payable page.
- [x] **2.3** Render only `session.allowedProviders`, in `sort_order`.
- [x] **2.4** Provider selection posts to a server action calling
  `startPayment`, then redirects to `initiate.redirectUrl`.
  **`checkout-flow.tsx:63` currently has the browser `fetch()` the webhook
  endpoint directly** — the customer's own client tells the server the payment
  succeeded. Delete that path entirely.
- [x] **2.5** A root page for `payment.softmato.com`. Only
  `/checkout/[sessionId]` exists on that subdomain today.

---

## §3 — Settlement: the return path

- [x] **3.1** `/checkout/[sessionId]/callback` — the provider return URL.
  Must **ignore every query parameter** and re-lookup by stored `providerRef`
  (Phase 4 acceptance 2: a forged `status=Completed` marks nothing paid).
- [x] **3.2** ~~Rewrite the three webhook routes.~~ **Resolved differently:
  there is no webhook to receive.** Khalti never pushes, eSewa returns the
  customer's *browser* to `success_url`, and Fonepay is unimplemented. All
  three routes now answer `410 Gone`; confirmation belongs to §3.1's callback
  page, which asks the provider directly. **The files still need deleting** —
  the permission classifier blocked the removal, so run:
  `rm -rf apps/web/app/api/v1/webhooks`
- [x] **3.3** Record a `provider_events` row for every callback and every
  lookup, verbatim (Phase 4).
- [x] **3.4** Prove idempotency against the database: five identical results
  post exactly one journal.

---

## §4 — Jobs

None of these exist. There is no `app/api/cron` directory at all.

- [x] **4.1** `expire-stale-sessions`
- [x] **4.2** `poll-pending-transactions`, exponential backoff, writing
  `pollAttempts` / `nextPollAt` / `lastPolledAt` — columns that exist on
  `transactions` and are never written.
- [x] **4.3** `retry-webhooks`
- [x] **4.4** `heartbeat`

---

## §5 — Admin screens on real data

All five were client components over hardcoded arrays. All five now read the
database. Filtering moved into SQL via the query string, so a filter is a
bookmarkable URL rather than an array held in the browser.

- [x] **5.1** `/admin/payments` — real transactions, journal number, provider
  reference, settled/in-flight/held totals counted over the whole table.
- [x] **5.2** `/admin/invoices` — real invoices, derived `past_due`, and a
  gapless-numbering check that surfaces a hole before an auditor finds it.
  **No creation form**: invoices are raised through `POST /v1/invoices` or the
  billing run, both of which allocate the number inside the inserting
  transaction. A second numbering path is how a gap appears.
- [x] **5.3** `/admin/reconciliation` — real held payments, and run items kept
  separate from them. **No resolve controls, by design** (`RULES.md` §2.8): an
  "accept provider amount" button is auto-resolution with a human's finger on
  it. Resolution needs the provider event, the bank statement, and reversing
  entries (Phase 7). The page also distinguishes "nothing is wrong" from
  "nothing has ever checked".
- [x] **5.4** `/admin/refunds` — real requests, **read-only and honest about
  why**. Two blockers, both stated on the page: no adapter implements
  `refund()` any more (§0.8), and `refund_needs_second_person` cannot be
  satisfied by a single admin — a founder decision recorded in `MEMORY.md`.
  The old screen's approve modal only called `setState`.
- [x] **5.5** `/admin/subscriptions` — real rows, read-only. Lifecycle is
  Phase 6; the old suspend and grace controls changed a colour and nothing
  else.

---

## §6 — Outbound webhooks + SDK

- [x] **6.1** Signing and delivery. `outbound_webhooks` and
  `webhook_deliveries` exist in the schema; **no code writes to or reads from
  either.**
- [x] **6.2** QStash delivery, retry, admin replay
- [x] **6.3** `packages/sdk/index.ts` is 2 lines. Build the typed client.

---

## §7 — Go-live (blocked on the founder)

- [ ] Live keys into the secret manager, never the repo
- [ ] Register live callback URLs in each merchant dashboard
- [ ] `*_ENV=live`, `PAYMENT_MODE=live`
- [ ] One NPR 10 real transaction: verify ledger, gapless txn number, receipt,
      webhook delivery, then a real refund and its reversal
- [ ] Fonepay only after the bank's integration document arrives (§0.4)

---

## §8 — Open decisions (research needed, not blocking)

Raised 2026-09-01 by the founder's question: *"are we polling for the
transaction approval, is it how production does it — then what is the webhook
function here?"* Both answers are settled; what is left is one design choice
that deserves research rather than a snap call.

**The two answers, recorded so nobody re-derives them:**

- **Inbound webhooks do not exist because these gateways do not offer them.**
  Khalti explicitly does not push (`/epayment/lookup/` is its documented
  confirmation path); eSewa redirects the *customer's browser* to `success_url`
  rather than calling us server to server; Fonepay is unknown pending the bank's
  document. Polling is not a shortcut here — it is the only channel.
- **The webhook code in this repo is entirely outbound.** `enqueueWebhook`,
  `retry-webhooks`, `X-Softmato-Signature`, and the SDK's `verifyWebhook` are
  *us* notifying our own API consumers. In that relationship we are the Stripe.
  It has nothing to do with how we learn from a gateway.

The principle either way: **the authority is always a server-side lookup.** A
webhook says *when* to look; it is never what you trust, because anyone can
POST to an endpoint.

### The open item — **resolved 2026-09-02: keep it**

- [x] **8.1 — Decide what happens to eSewa's `handleCallback`.**

  **It stays, and it is not dead code. It is Phase 5's callback handler,
  written early.** The previous recommendation was to delete it; that was made
  without reading `PHASES.md` Phase 5, which asks for exactly this code:

  > - Callback handler: verify → persist → enqueue → 200, under 200ms
  > - 5-minute fallback to status check
  >
  > **Accept when** … 2. An invalid signature is rejected before any processing
  > … 3. A suppressed callback is recovered by polling within 6 minutes
  > … 5. The callback handler responds in under 200ms

  Deleting `handleCallback` would have removed the only implementation of
  acceptance 2 and made acceptance 5 unreachable — a 300ms round trip to
  eSewa's status API cannot answer in under 200ms. The "dead code on a
  settlement path" worry was fair, but the answer is to say what it is for,
  not to delete a phase's work and rewrite it in a month.

  **The research questions the old entry asked, answered:**

  - *Settle on the redirect payload, or always re-look-up?* **Both, in that
    order.** eSewa names the status API the anti-fraud authority and tells
    merchants to verify every transaction with it. Common Nepali integrations
    verify the HMAC on the redirect **and** cross-check the status API before
    marking an order paid.
  - *Does eSewa guarantee the redirect arrives?* **No.** Its own guidance is
    that if a response has not arrived within five minutes, use the status
    check API — which is where `PHASES.md`'s "5-minute fallback" comes from.
    A settlement path that depends on the browser coming back is therefore
    incomplete by eSewa's own account, which is why `poll()` is not optional
    regardless of what happens to this method.
  - *Can the two disagree, and which wins?* The status API wins, always. It is
    eSewa's live record; the redirect is a signed snapshot of a moment. This is
    the rule to encode when Phase 5 wires the fast path: **the callback may
    settle, but a later poll that disagrees is the one that stands.**

  **What that means for today, in Phase 3.** Nothing changes. `confirmTransaction`
  polls, which is the safe subset of the Phase 5 design — slower by one round
  trip and correct. The method is kept, its docstring now says it belongs to
  Phase 5 rather than reading as an unused capability, and the interface member
  stays with it.

---

## §9 — What sandbox testing actually found (2026-09-02)

### 9.1 — Every recorded eSewa sandbox key in this repo was wrong

`.env.example`, both adapter tests and the eSewa docstring carried
`8gBwcE4DOHB28vvi`; `docs/ENVIRONMENT.md` carried a third value again. Posting
the ePay v2 form signed with `8gBwcE4DOHB28vvi` returns:

```json
{"code":"ES104","message":"Invalid payload signature."}
```

The real published sandbox key is `8gBm/:&EnhH.1/q`, which returns `302` into
the payment page. **Every sandbox attempt would have failed at the door**, with
an error that reads like a bug in the signing code rather than a wrong secret —
the worst possible failure mode, because the signing code was correct.

Two things made this survive a whole session of work:

1. **The tests could not catch it.** Every eSewa test signed with `SECRET` and
   verified with `SECRET`, so the HMAC round-tripped — and it round-trips just
   as happily with a key eSewa has never heard of. A self-consistent test
   cannot detect a wrong shared secret. `tests/esewa-signature.test.ts` now
   pins a vector produced with the real key, so changing the constant fails.
2. **Nothing had ever called the gateway.** The defect was invisible until the
   first real request, and the first real request is what §1–§3 made possible.

The key must be quoted in a `.env` file — it contains `&`, `:` and `/`.

### 9.2 — Khalti is testable too, and always was

Khalti publishes a shared sandbox key in its own integration examples. Verified
2026-09-02: `POST https://dev.khalti.com/api/v2/epayment/initiate/` with it
returns a `pidx` and a `test-pay.khalti.com` payment URL. The sandbox host is
`dev.khalti.com`, not the `a.khalti.com` the adapter used — the old host still
answers identically, but the documented one is what the adapter now targets.

Khalti calls its sandbox key `live_secret_key_…`. That is Khalti's naming and
not a live credential.

### 9.3 — The provider rows had to be switched on

`payment_providers` had `esewa`, `khalti` and `fonepay` all `is_active = false`,
and the only active row was `manual_qr` — a concept removed on 2026-08-16 with
no adapter and no entry in `PROVIDER_IDS`. `createSession` therefore computed
`allowed_providers = ['manual_qr']` and the checkout page offered nothing at
all. Now: `esewa` and `khalti` active, `manual_qr` deactivated rather than
deleted, because existing sessions reference it.

### 9.4 — The composition root's idempotence guard was wrong

Found by editing a file while the dev server was running, which is to say: it
would have been found by the next person to touch this code, as a 500 on the
checkout page.

`ensureProvidersRegistered()` guarded itself with a module-level
`let registered = false`. That assumes `lib/payments/providers.ts` and
`payment-core`'s `REGISTRY` map share a lifetime. They do not — Next
re-evaluates changed modules independently, so the flag reset while the
registry kept its entries, and the next request threw
`Provider esewa is already registered` from the guard whose whole job was to
prevent that.

Now the idempotence is read from the registry (`hasProvider`), which is the
only thing that actually knows. Two related corrections came with it:

- `registerReal`/`registerMocks` no longer return "what I registered", because
  on the second call that is legitimately nothing.
- The "nobody can pay" check reads `registeredProviders().length` instead, or
  a correctly configured deployment would have failed its own boot check on
  its second request.

`registerProvider`'s throw is untouched and still correct: two *different*
modules each claiming a provider is a real wiring bug. The composition root
asking whether it has already done its own work is not that case.

### 9.5 — Cancelling a payment produced a 500, twice over

Found by pressing Cancel on a real Khalti sandbox payment. Two separate
defects, both on the customer-facing money path, neither reachable before §1–§3
made a real gateway call possible.

**Khalti answers a cancelled payment with HTTP 400.** The body is a complete,
correct lookup result:

```json
{"pidx":"…","total_amount":10000,"status":"User canceled",
 "transaction_id":null,"fee":0,"error_key":"khalti_error"}
```

The adapter treated every non-2xx as a transport failure, so the most ordinary
outcome in payments — the customer changed their mind — was thrown as
`PROVIDER_UNAVAILABLE` and reached them as **"Something broke on our side"**.
Worse than the page: `poll-pending-transactions` hit the same throw on that row
on every run, spending its attempts and eventually handing a person a cancelled
payment to investigate.

Fixed by letting the body decide rather than the status code — but only when it
carries a status we already have a mapping for. A bad key
(`{"detail":"Invalid token."}`) and an unknown pidx
(`{"detail":"Not found."}`) carry no `status` and still raise, which is right.

**And then reloading that page lied.** `failed`, `cancelled` and `expired` are
terminal, so a second dispatch attempted `cancelled → cancelled`, got
`ILLEGAL_TRANSITION`, and `confirmTransaction` reported it as `pending` — the
correct reading of a lost race, and the wrong one here. The customer saw *"your
payment is still being confirmed… we will email a receipt as soon as it does"*
about a payment they had deliberately stopped. `close()` now reports what the
row already says when the status is terminal, which is honest and idempotent.

Both are pinned: four tests in `tests/khalti-adapter.test.ts` for the 400, two
in `tests/payment-settle.test.ts` for the reload.

**The general lesson, worth carrying into Phase 9.** Both bugs are the same
shape: a normal outcome routed down an error path. A gateway's HTTP status code
describes the *request*, not the *payment* — and "the customer said no" is an
answer, not a failure. Ask what the body says before deciding anything went
wrong.

### 9.6 — What is proven (updated 2026-09-02, after real sandbox payments)

**Phase 3 is closed — all ten acceptance criteria are met** (5 on 2026-09-02, the rest earlier the same day).

Two real payments completed through the live sandboxes, one per gateway, and
verified in the database rather than taken from the page:

| | Khalti | eSewa |
| --- | --- | --- |
| Transaction | `TXN-2083/84-00000007` | `TXN-2083/84-00000008` |
| Amount | NPR 100.00 | NPR 150.00 |
| Provider txn id | `FHAwbiLzoRvq4jDon6hWha` | `000GYAH` |
| Journal | `JE-2083/84-000011` | `JE-2083/84-000013` |
| Debit account | **1032** (Khalti balance) | **1031** (eSewa balance) |
| Credit account | 1110 | 1110 |
| Invoice | `INV-2083/84-000010` `paid` | `INV-2083/84-000011` `paid` |
| Receipt emailed | yes, confirmed in the inbox | yes, confirmed in the inbox |

Each settled to **its own** balance account, which is the `payment_providers`
configuration proving itself rather than a coincidence of one provider.

Also proven along the way:

- [x] Exactly one journal per transaction, on real money (acceptance 9).
- [x] `provider_fee_minor` is **0 taken from the provider**, never computed
      (RULES.md §2.7). Khalti reported `fee: 0`; eSewa reports no fee at all.
- [x] The callback settles by **server-side lookup**. eSewa's
      `provider_events` row holds the *status API* response
      (`{"ref_id":"000GYAH","status":"COMPLETE",…}`) with `poll_attempts: 0`
      — the page ignored every query parameter and asked eSewa directly.
- [x] `transaction_uuid` sanitisation (§0.7) survives contact with the real
      gateway: `cs_test_…` → `cs-test-…`, which eSewa accepted.
- [x] A cancelled payment closes cleanly and reports honestly (§9.5).
- [x] `poll-pending-transactions` writes `poll_attempts`, `last_polled_at`,
      `next_poll_at`; cron auth returns 200 on a good secret and 404 on a bad.
- [x] `v_unbalanced_journals` empty throughout.

**And the last one:**

- [x] **Acceptance 5 — the SaaS receives a signed webhook and verifies it.**
      Closed 2026-09-02. Five queued deliveries were flushed by the real
      `POST /api/jobs/retry-webhooks` route — not by calling `retryWebhooks()`
      from a script — to `scripts/webhook-receiver.mts`, which verified every
      one of them with the SDK's `verifyWebhook`:

      ```
      {"job":"retry-webhooks","ok":true,"ms":602,
       "attempted":5,"delivered":5,"failed":0,"abandoned":0}
      ```

      | Event | Transaction | Receiver |
      | --- | --- | --- |
      | `payment.cancelled` | `TXN-2083/84-00000004` | VERIFIED |
      | `payment.failed` | `TXN-2083/84-00000005` | VERIFIED |
      | `payment.cancelled` | `TXN-2083/84-00000006` | VERIFIED |
      | `payment.success` | `TXN-2083/84-00000007` | VERIFIED |
      | `payment.success` | `TXN-2083/84-00000008` | VERIFIED |

      The last two are the real sandbox payments in the table above, so the
      event a consumer provisions on is the one that was proven end to end.
      Confirmed in the database rather than from the log: all five rows
      `status = delivered`, `last_status_code = 200`, `delivered_at` set,
      `attempts = 1`. `pnpm webhook:status -- --all` prints exactly that.

      **No gateway payment was needed.** The deliveries were already queued by
      the settlements of 2026-09-02; what had never run was the delivery half.
      A fresh payment would prove the same thing more slowly.

### 9.7 — The runbook (this is what was run)

Three terminals:

```
pnpm --filter @softmato/web dev
pnpm webhook:receive -- --secret <applications.webhook_secret>
pnpm demo:checkout -- --amount 100 --email <a real inbox>
```

**The receiver's secret is `applications.webhook_secret`, not the client
secret.** They are different credentials and only one can work:
`webhooks/enqueue.ts` signs with `webhook_secret`, and the client secret is
argon2-hashed and unrecoverable anyway.

```sql
SELECT webhook_secret FROM applications
 WHERE client_id = 'app_test_hostelhub_2d90d3bq';
```

Open the printed URL, choose a provider and complete the payment:

- **eSewa** — id `9806800001`, password `Nepal@123`, MPIN `1122`, token `123456`
- **Khalti** — Khalti ID `9800000001`, MPIN `1111`, OTP `987654`

Then confirm: the callback page says "Payment received", the receiver prints
`VERIFIED`, and

```sql
SELECT * FROM v_unbalanced_journals;   -- must be empty
```

If the browser tab is closed instead, the same settlement happens on the next
`poll-pending-transactions` run — which is the point of it.

### 9.8 — What acceptance 5 found: an unsigned POST crashed the consumer

The positive half passed first try. The negative half — *restart the receiver
with a wrong secret and confirm it says REJECTED*, because a verifier that
cannot fail is not evidence — is what earned its keep.

Four rejections were exercised on the wire. Three behaved:

| Case | Reason reported |
| --- | --- |
| Genuine delivery, receiver holding the wrong secret | `signature_mismatch` |
| Body edited after signing (`amount` → 999999) | `signature_mismatch` |
| Captured delivery re-sent 10 minutes later | `timestamp_too_old` |

The fourth — **a POST with no `X-Softmato-Signature` header at all** — did not
report anything. It threw:

```
TypeError [ERR_INVALID_ARG_TYPE]: The first argument must be of type string …
Received undefined
    at equalInConstantTime (packages/sdk/webhooks.ts:122)
    at verifyWebhook (packages/sdk/webhooks.ts:105)
```

and the receiver process exited.

**Why this mattered more than a demo script dying.** The fault was in
`verifyWebhook` — the function every SaaS integrator calls — not in the
receiver. `Buffer.from(undefined)` throws, so an absent header unwound as an
exception through the *consumer's* route instead of returning
`{ valid: false }`. On a public endpoint that is unauthenticated input: anyone
who finds the URL can send an empty POST. A Next route would answer 500 where
400 belongs; a bare `node:http` consumer, like the one in this repo, dies.

Our own SDK docstring taught the mistake — `headers.get('x-softmato-signature')!`
— and the `!` was a lie, because that call returns `null` when the header is
absent.

Fixed in three places, and the type change is the real fix:

- `VerifyInput.signature` and `.timestamp` now admit `string | undefined | null`,
  so the type system stops telling integrators to assert away the case that
  actually happens. The `!` is gone from the docstring.
- A `missing_signature` guard runs before anything else in **both**
  `packages/sdk/webhooks.ts` and `packages/payment-core/webhooks/signature.ts`.
  Duplicated deliberately: `SHARED_VECTOR` keeps the two implementations
  producing the same digest, and they should also give the same *answer* to the
  same request — a behavioural split is as much a drift as a digest split.
- `missing_signature` joins `VerifyFailure`. Consumers switching exhaustively
  on the union get a compile error, which is the correct amount of noise.

Pinned by a regression test in each suite (`packages/sdk/tests/webhooks.test.ts`,
`packages/payment-core/tests/webhook-signature.test.ts`), each asserting
`undefined`, `null` and `''` all return `missing_signature` rather than throwing.

Re-run afterwards, the receiver reported `missing_signature`, `signature_mismatch`,
`signature_mismatch`, `timestamp_too_old` — **and then verified a genuine
delivery**, which is the part that proves it stayed up.

`pnpm webhook:replay` is the tool that found it, and it is now the admin replay
§6.2 asked for: it re-sends a stored `webhook_deliveries` row to any URL,
re-signed with a fresh timestamp exactly as `deliver.ts` does. It deliberately
writes nothing back — `attempts`, `status` and `delivered_at` are the record of
what the *job* did, and a diagnostic that overwrote them would destroy the
evidence it was run to collect.

### 9.9 — Open question for go-live: eSewa `NOT_FOUND` is terminal

**Not changed, because changing it on a guess is how money gets lost either
way.** Raised here so §7 does not start without an answer.

`NOT_FOUND` from eSewa's status API maps to `failed`, and `failed` is terminal
and unrecoverable without a person. On 2026-09-02 that was correct behaviour —
it was returned for a payment the customer had abandoned, which is exactly what
it is documented to mean.

The risk is the other reading. If eSewa ever answers `NOT_FOUND` for a payment
that is *still in flight* — a lookup racing the gateway's own write, a brief
inconsistency between their nodes — then `poll-pending-transactions` would
permanently close a live payment, and the customer's money would be at eSewa
with our books saying the payment failed. Terminal states are exactly the ones
that must not be entered on ambiguous evidence.

Three ways it could go, none of them pickable from here:

1. `NOT_FOUND` is genuinely terminal, and this is already right.
2. `NOT_FOUND` is terminal only after some age — treat it as `pending` while
   the transaction is younger than that, `failed` after.
3. `NOT_FOUND` is ambiguous, and it belongs in reconciliation for a human
   rather than in either terminal state.

**What settles it:** eSewa's own documentation on the status API's response
codes, or a support answer, or observing one live. Ask before `*_ENV=live`.

---

## §10 — Invoice and receipt documents (2026-09-02)

Built after Phase 3 closed, to the founder's billing spec
(`softmato-billing-spec.md` §5 and §6). **White paper, black ink, the spec's
layout.** One set of components renders the admin screen, the browser print
dialog and the emailed PDF, so an admin, a customer and an auditor are always
looking at the same document rather than three lookalikes built from one query.

### What exists now

| | |
| --- | --- |
| `lib/documents/` | The value layer — types, builders, snapshot resolution, amount-in-words |
| `components/documents/` | `InvoiceSheet`, `ReceiptSheet`, and the self-contained stylesheet |
| `/admin/invoices/[...invoiceNo]` | The document plus its full payment history |
| `/admin/receipts/[...txnNo]` | The receipt, or an honest page saying why there is none |
| `/api/internal/documents/…` | Admin download: `?format=html\|pdf`, `&print=1` |
| `GET /v1/invoices/{no}` | The SaaS's own read — JSON, HTML or PDF |
| `GET /v1/receipts/{no}` | Same, for a settled payment |
| `pnpm doc:preview [-- --pdf]` | The design loop, with no database and no admin session |

Catch-all route segments throughout, because `INV-2083/84-000010` is one
identifier and two path segments. Percent-encoding the slash was the
alternative and it depends on every proxy between the browser and the router
agreeing not to decode it.

### Decisions worth not relitigating

- **Plain CSS string, not Tailwind.** The PDF is rendered by a headless browser
  with no build pipeline and no `globals.css`. A document built on the app's
  utility classes renders correctly on screen and arrives in the customer's
  inbox unstyled.
- **Two PDF engines behind one seam** (`lib/documents/pdf.ts`). A Chrome or
  Edge on the machine, driven by its own `--print-to-pdf` — no dependency, no
  protocol client, `CHROME_PATH` or a standard install location is the whole
  configuration. Failing that, the Chromium bundled into the deployment, which
  is the production engine because Vercel's servers have no browser.
  **With neither, it falls back to HTML with a header saying so**, never an
  error — a browser prints the HTML perfectly well, and refusing to serve
  anything is a worse answer to "download this invoice".
- **Nothing is invented.** `company.pan`, `company.address` and `company.phone`
  are empty in `platform_settings` today, so the document prints "PAN not set"
  and the admin screen carries a banner naming every missing field. A plausible
  PAN on a statutory document is the one failure mode worse than a blank.
- **VAT is stated in a sentence and never as a row.** `INVOICE`, never "Tax
  Invoice" — both are pinned by tests, because both are claims about a
  registration Softmato does not hold.
- **The receipt is A5, the invoice A4.** The size difference is what tells the
  two apart across a desk before either is read.
- **Amount in words** (`Twenty Thousand Rupees Only`) is generated from the
  same `bigint` paisa as the figures, in lakh–crore scale to match
  `formatPaisa`'s grouping. A document whose figures group in pairs and whose
  words count in millions disagrees with itself.

### `presentation` — the SaaS describes its own plan

A SaaS sends `presentation` on `POST /v1/invoices`: plan name, tagline, up to
8 features, up to 3 highlights, billing period. It renders on the checkout page
beside the amount and on the invoice under the line items.

Stored in `invoices.metadata.presentation` — an existing `jsonb` column, so it
cost no migration — versioned, and **re-validated on the way out** rather than
trusted because it was validated on the way in. It ends up on a customer-facing
document; invalid content renders as nothing.

**It is presentation, never arithmetic.** Nothing in it can change what is
owed, which is the only reason integrator-supplied free text may be printed on
a statutory document at all. The API rejects a price in any field (`NPR 5,000`,
`Rs. 5000`, `5,000/-`): a bullet quoting a figure that disagrees with the total
is a dispute the customer wins. Rules are in docs/API.md §3 and
docs/INTEGRATION.md.

### Two defects the live verification caught

Both were invisible to typecheck and to the sample fixtures, and both surfaced
only on the first authenticated call against real rows.

- **The receipt printed the wrong reference.** It preferred
  `transactions.provider_ref`, which is the handle used to *start* a payment —
  Khalti's pidx, eSewa's `transaction_uuid`, which is our own session id
  sanitised. The gateway's own settled id is `provider_txn_id`
  (`000GYAH`, `FHAwbiLzoRvq4jDon6hWha`), written at completion. Spec §6 wants
  the second: it is the number the payer finds in their own wallet statement.
  Printing the first gives them a reference their statement does not contain,
  which is worse than printing none — they conclude our record is of a
  different payment. Fixed; the admin payment-history column too.

- **A catch-all route segment must be last.** `/v1/payments/[...txnNo]/receipt`
  is not a legal Next route and took the whole dev server down with a Turbopack
  panic, not a compile error in that file. The receipt is now its own resource,
  `GET /v1/receipts/{txn_no}`, which is the better URL anyway — it is a
  document, not a sub-view of something else.

Also corrected: `react-dom/server` is refused anywhere the App Router can reach
it; `react-dom/server.edge` exports the same `renderToStaticMarkup` and is
permitted. And the VAT footer no longer hardcodes "Pvt. Ltd." while the header
reads "Private Limited" from `company.legal_name` — two spellings of the entity
on one financial document is exactly the kind of detail that makes a reader
doubt the rest of it.

### Verified against live data (2026-09-02)

`GET /v1/invoices/INV-2083/84-000012` returns the document with its
`presentation` echoed back; `?format=pdf` returns 157 KB of `%PDF-`.
`GET /v1/receipts/TXN-2083/84-00000008` renders the **real eSewa payment** from
§9.6 — NPR 150.00, `000GYAH`, `JE-2083/84-000013`, "One Hundred Fifty Rupees
Only", PAID IN FULL. Unauthenticated calls answer `401 UNAUTHENTICATED`.

`company.pan`, `company.address` and `company.phone` **are** populated
(623692242, Kathmandu, 9709155982), so documents render complete. The
"PAN not set" path remains as the guard, not the normal case.

`pnpm app:secret -- --client-id <id>` rotates and prints a client secret. It is
the only way to get a usable one — secrets are argon2id-hashed at issue and
never recoverable, so rotation is the intended path rather than a workaround.
It refuses a live application without `--yes-live`.

### Documents are stored, not re-rendered (2026-09-02)

A rendered PDF now goes into the private R2 bucket and is read back from there.
The point is not the bytes — it is that **the browser stops running on the
customer's click**. `POST /v1/invoices` schedules the render with `after()`, so
the SaaS's API call does not wait for it and the document is on the shelf
before anyone asks; a receipt is stored by the same render that attaches it to
the receipt email, at the moment the payment settles.

| | |
| --- | --- |
| `lib/storage/private-client.ts` | The private bucket's own client. **No URL function, ever** |
| `lib/storage/private-object.ts` | Read and write one object; both answer rather than throw |
| `lib/documents/object-key.ts` | `company/invoices/{fy}/{no}-{fingerprint}.pdf` |
| `lib/documents/pdf-store.ts` | The key, the fingerprint, and the two bucket calls |
| `lib/documents/document-pdf.ts` | Store → render → store. The only caller of `renderPdf` on a request path |
| `lib/documents/prerender.ts` | The `after()` schedule, which cannot fail a request |

**The key carries a fingerprint of the rendered HTML, and that is the whole
design.** An invoice is not immutable after issue — it gets paid, it goes past
due, its balance falls — so a PDF stored under the bare invoice number would be
served for months saying UNPAID about an invoice settled in March. Hashing the
markup means a changed document simply misses and is rendered again: no
invalidation to forget, no TTL, and no state in which a stale financial
document can be handed to a customer. Hashing the *HTML* rather than a list of
fields is deliberate too — a field list is a second description of the document
kept by hand, and the day someone adds a line to the template without adding it
to the list is the day the cache starts lying.

Superseded renders are kept. They are what the invoice looked like when it was
sent.

**Nothing here can fail a download.** No bucket configured, R2 refusing, no PDF
engine — each falls back to the behaviour that existed before: render on
demand, and HTML with `X-Softmato-PDF-Fallback` when there is no engine. That
fallback is what lets this ship while Task 1 is still open.

`R2_PRIVATE_BUCKET` is now read, and is checked as a group with the account id
and key pair (`privateStorageConfigured`) — separately from the public bucket,
which needs an `R2_PUBLIC_BASE_URL` a private bucket must never have.

Tests: `document-object-key.test.ts` (7), `document-pdf-store.test.ts` (9) and
`pdf-engine.test.ts` (6),
plus `private-storage-live.test.ts`, which is skipped unless `R2_LIVE_TEST=1`
because it writes to the real bucket. 323 web tests pass, 3 skipped; typecheck
and lint clean.

**Verified against the real bucket and a real invoice (2026-09-02).** A
round-trip PUT/GET under `company/invoices/0000-00/` succeeds and an absent key
reads as `null` rather than throwing. `INV-2083/84-000012` was then run through
the production path end to end: first call rendered with Chrome and returned
`%PDF-`, second call came back `source: 'store'` with byte-identical content.
That second call is the one that matters — it is the download that no longer
starts a browser.

    R2_LIVE_TEST=1 SOFTMATO_LIVE_INVOICE='INV-2083/84-000012'       pnpm --filter @softmato/web test private-storage-live

### The engine, settled (2026-09-02)

`@sparticuz/chromium` + `puppeteer-core`, chosen over a render service because
an invoice carries a customer's name, PAN and what they bought, and a hosted
renderer means all of that crossing into a third party for no saving we need.
No monthly bill either.

`renderPdf` is now a two-engine seam and the two engines are separate modules:

| | |
| --- | --- |
| `lib/documents/pdf.ts` | Picks one, and answers `{ ok: false, reason }` when neither can run |
| `lib/documents/pdf-chrome.ts` | The local binary and its `--print-to-pdf`, unchanged |
| `lib/documents/pdf-chromium.ts` | Bundled Chromium over CDP. Dynamically imported |
| `lib/documents/pdf-result.ts` | The shared result type, so the 65 MB engine stays behind that dynamic import |

**A local binary wins where there is one.** It starts faster than unpacking
Chromium into `/tmp`, and the bundled build is Linux x64 — on Windows and macOS
it declines with an honest reason instead of failing inside an unpack. So
`pnpm doc:preview` and every developer machine keep the engine they had, and
Vercel gets the one it needs.

**A degraded render is served but never stored.** If the Google Fonts faces do
not arrive, the document is laid out in a fallback face and the figures lose
their tabular alignment. The caller still gets a PDF; it is not archived,
because the key is the document's identity and a stored bad render would answer
every future request for that invoice, permanently, with no way to notice from
outside.

Bundler wiring, which is where this usually goes wrong: both packages are in
`serverExternalPackages` — `@sparticuz/chromium` locates its own binary
relative to its package directory, so inlining it breaks the package at the
point of use rather than at build. The binary is traced
(`outputFileTracingIncludes`) into exactly the five routes that can start a
browser: the three that read a document as PDF, plus `POST /v1/invoices` and
the two settlement paths that render the receipt for its email. 65 MB does not
go on every function for the benefit of five. Note the keys are globs — a
literal `[sessionId]` segment reads as a character class and silently matches
nothing; `/checkout/*/callback` is the one that works.

Verified: production build clean, and the `.nft.json` traces confirm
`chromium.br` reaches all five routes and none of the others.
`pnpm doc:preview -- --pdf` still renders through local Chrome at the same
sizes as before (158 KB invoice, 109 KB receipt), and the live end-to-end test
still passes. **The serverless engine itself cannot be exercised on Windows** —
its first real run is the first deploy, and the fallback is what covers it if
something is wrong there.

### Party snapshots are written (2026-09-02)

Spec §2.1: *"if the customer later changes their address, an already-issued
invoice must not change."* `createInvoice` now freezes both parties into
`invoices.metadata.snapshots` — no migration, and **in the same `INSERT` that
allocates the number and sets `issued_at`**, so there is no window in which an
issued invoice exists without them.

| | |
| --- | --- |
| `packages/payment-core/invoices/snapshot.ts` | The shape, and the two pure functions that compose it |
| `packages/payment-core/invoices/create.ts` | Writes it; `upsertCustomer` now returns the row, not just an id |
| `apps/web/lib/documents/seller.ts` | Pure `sellerFromSettings` + `missingSellerFields`, no longer `server-only` |
| `apps/web/lib/documents/seller-query.ts` | The `server-only` read that was the reason the module could not be shared |

**The customer comes from the row, not from the request.** `address` cannot be
sent through the API at all — it only ever comes from the admin panel — and a
PAN already on file survives a request that omits one. Snapshotting the request
would have dropped both off the document with nothing to notice.

**The seller is passed in, not read.** It lives behind the app's settings
registry, which knows the key names, the defaults and the contact→support email
fallback; `payment-core` may not import app code, and re-deriving that against
raw rows would be a second, quieter copy of it. The parameter is required and
explicitly nullable, so a new call site has to decide rather than inherit a
silent default. Both call sites — `POST /v1/invoices` and
`scripts/demo-checkout.mts` — pass the real thing.

**A caller cannot forge one.** `metadata` is free-form and handed through from
the API (it is how `presentation` arrives), so `snapshots` is merged in last.
Otherwise a request could name one customer on the printed document while
billing another.

The reader's stored shape is now typed against `PartySnapshot` from the package
that writes it, so the two cannot drift without failing to compile.

**Invoices issued before today have no snapshot and never will.** They fall
back to live data and say so — `renderedFromLiveParties`, and the admin banner
that reads it.

Verified on real rows. `pnpm demo:checkout` issued `INV-2083/84-000013` through
the same `createInvoice` the API calls; both snapshots are in the column and the
document renders `renderedFromLiveParties: false`. Then the customer's address
was changed in the `customers` table and the invoice **did not move** — the
document still rendered the frozen value while the live row said Pokhara.
`INV-2083/84-000012`, issued before this existed, still reports
`renderedFromLiveParties: true`, which is the honest answer for it. Address
restored afterwards; `v_unbalanced_journals` is zero (the db suite's teardown
asserts it).

Tests: `packages/payment-core/tests/invoice-snapshot.test.ts` (8) for the
composition, and `apps/web/tests/invoice-snapshot-live.test.ts` for the round
trip — skipped unless `SOFTMATO_LIVE_INVOICE` names an invoice, because it
needs a database:

    SOFTMATO_LIVE_INVOICE='INV-2083/84-000013'       pnpm --filter @softmato/web test invoice-snapshot-live

156 payment-core, 323 web, 97 db, 25 sdk, 11 accounting — all pass; typecheck
and lint clean.

### Renewals and SaaS onboarding (2026-09-02)

`docs/INTEGRATION.md` §5 now carries the recurring-billing pattern we recommend
to every integrator: **7 days before, 7 days grace**, bill early and create the
checkout session only when the customer presses Pay, and an `external_ref` that
contains the period so a renewal job that runs twice cannot bill twice. All
advice except the reference key, which is phrased as a rule because the failure
mode is a customer charged twice for one month.

§1 also now states plainly that **pre-payment emails are the SaaS's**, not
ours — we send the receipt and nothing before it — and that they fetch our
invoice over the API to attach to their own notices.

`saas-implementation.md` at the repo root holds the open arguments this raised
and is where the next session on this should start: who drives renewals (us or
the SaaS), how a SaaS gets credentials (leaning: they register, we approve live
only), and where the binding standards live — recommendation is a dated
`/legal/partner-terms` page, because a how-to guide cannot make anything
compulsory.

### Still open

- [ ] **Receipt numbering differs from the spec.** §2.3 wants an `R-` series;
      this platform reuses the transaction number, deliberately and with its
      reasoning in `packages/payment-core/receipts/receipt.ts`. Still
      unconfirmed with an accountant.
- [ ] **Bank transfer details** are not printed — spec §5 has a bank line, and
      no account number has been given. Same rule as the PAN: blank, not
      invented.
- [ ] **Credit notes** (spec §4.2, §10) are unbuilt. The renderer refuses to
      word a negative amount rather than printing "Minus Twenty Thousand
      Rupees Only" on an invoice.

---

## Standing rules for this work

1. **A missing credential throws.** It never falls back to success.
2. **Only `MockProviderAdapter` may fabricate a result**, and only when
   `PAYMENT_MODE=mock`.
3. **Verify signatures before reading any other field.**
4. **Never compute a provider fee.** It comes from the provider (`RULES.md` §2.7).
5. **Never auto-resolve a reconciliation flag** (`RULES.md` §2.8).
6. **Do not guess a provider's request shape.** Ask. This is what §0.4 is about.
7. After each section: `v_unbalanced_journals` must return zero rows.
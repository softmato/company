# Architecture

## 1. Shape of the system

One Next.js application, four surfaces distinguished by subdomain, one
PostgreSQL database, two supporting services.

```
                          ┌─────────────────────────┐
                          │   Vercel (bom1/Mumbai)  │
                          │   one Next.js app       │
                          ├─────────────────────────┤
  softmato.com       ───▶ │  (public)   marketing   │
  admin.softmato.com ───▶ │  (admin)    operations  │
  payment.softmato…  ───▶ │  (checkout) payment UI  │
  agency.softmato…   ───▶ │  (portal)   clients     │
  SaaS backends      ───▶ │  /api/v1    payment API │
  providers          ───▶ │  /api/callbacks         │
  cron / QStash      ───▶ │  /api/jobs              │
                          └───────────┬─────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      Neon PostgreSQL          Upstash Redis           Upstash QStash
      (Mumbai)                 idempotency,            durable queue,
      authoritative record     locks, rate limits      retry, dead-letter
              │
              ▼
      Cloudflare R2
      private: proofs, invoice PDFs
      public:  CMS assets
```

Subdomain routing happens in `proxy.ts`, rewriting to route groups. One
deployment, one build, one set of shared types.

---

## 2. The central payment principle

A SaaS product must never contain eSewa logic, Khalti logic, provider
credentials, signature code, webhook handling, or reconciliation.

```
✗  HostelHub ──────▶ eSewa
   QuestionCall ───▶ Khalti

✓  HostelHub ─────┐
   QuestionCall ──┼──▶ Central Payment API ──▶ providers
   SaaS-3 ────────┘
```

What a SaaS implements: create an invoice, request a checkout session, redirect
the customer, receive a webhook, update its own entitlement. That's all.

---

## 3. Payment flow, end to end

```
Customer clicks "Pay" in HostelHub
        │
        ▼
HostelHub backend
        │  POST /api/v1/checkout
        │  Authorization: Bearer <secret>
        │  Idempotency-Key: <key>
        ▼
Central Payment API
        │  authenticate → check scopes → validate
        │  verify invoice ownership
        │  recompute amount from the invoice, never from the request
        │  compute allowed_providers by amount
        ▼
Payment session created  (32+ bytes entropy, 30-minute expiry)
        │  { session_id, checkout_url, expires_at }
        ▼
Customer redirected to payment.softmato.com/checkout/<session_id>
        │
        │  selects a method
        ▼
Provider adapter .initiate()
        │
        ▼
Fonepay (primary) / eSewa / Khalti
        │
        ├── callback path (eSewa) ────┐
        └── polling path (Khalti) ────┤
                                      ▼
                        Central verification
                        signature / authenticated lookup
                        amount comparison
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
                mismatch →                    match →
                reconciliation_required       succeeded
                nothing posts                        │
                human investigates      ┌────────────┼────────────┐
                                        ▼            ▼            ▼
                                  Journal entry  Invoice     Webhook
                                  (balanced)     updated     queued
                                                                  │
                                                                  ▼
                                                        HostelHub marks PAID
```

**Two confirmation paths, one outcome.** eSewa posts a signed callback. Khalti
does not push webhooks at all — confirmation is redirect-then-lookup plus
scheduled polling. Both paths converge on the same verification and posting
code. `poll()` is implemented for every provider and is the universal safety
net.

---

## 4. Package boundaries

```
packages/
├── db/              schema, migrations, Drizzle client
├── payment-core/    providers, state machine, verification, sessions
├── accounting/      journals, posting rules, period close, reports
├── sdk/             typed client shipped to the SaaS products
├── ui/              shared components
└── config/          eslint, tsconfig, tailwind preset
```

### The critical boundary

**`payment-core` and `accounting` must not import from `next`.**

Pure TypeScript, pure functions plus a database handle. Route handlers under
`app/api/` are thin adapters: parse, authenticate, call into the package,
serialize.

This is the escape hatch. If the API ever needs to move to a dedicated service
with a static IP — because a bank gateway requires mTLS, or reconciliation
outgrows function timeouts — we wrap these packages in a new shell. Days, not a
rewrite.

### Dependency direction

```
apps/web  ──▶  sdk, ui, payment-core, accounting, db
payment-core ──▶ db
accounting   ──▶ db
db           ──▶ (nothing internal)
```

`payment-core` may call `accounting.postJournal`. `accounting` must never
import `payment-core` — accounting knows nothing about providers.

---

## 5. Data flow into the ledger

Every financial event follows one path:

```
Verified provider result
        │
        ▼
BEGIN
  SELECT … FOR UPDATE on the transaction row
  already succeeded? → return, no-op
  amount mismatch?   → reconciliation_required, STOP
  update transaction
  postJournal(...)                     ← accounting package
  store journal_id on the transaction
  update invoice paid_minor / status
  insert webhook_deliveries row
  insert audit_logs row
COMMIT
```

The database rejects the commit if the journal doesn't balance. The
`succeeded_needs_journal` constraint makes a successful transaction without
ledger entries impossible.

---

## 6. Background work

Nothing important happens inline in a request.

| Job                         | Frequency | Why                              |
| --------------------------- | --------- | -------------------------------- |
| `poll-pending-transactions` | 1 min     | Khalti's only confirmation path  |
| `expire-stale-sessions`     | 5 min     | Sessions past `expires_at`       |
| `retry-webhooks`            | 1 min     | Failed SaaS deliveries           |
| `recognize-revenue`         | monthly   | Release deferred revenue         |
| `generate-renewal-invoices` | daily     | Subscriptions nearing period end |
| `send-dunning-reminders`    | daily     | 7d / 3d / 1d, then overdue       |
| `suspend-past-grace`        | daily     | Grace expired                    |
| `reconcile-providers`       | daily     | Ledger vs. provider totals       |
| `heartbeat`                 | 5 min     | Dead-man's switch                |

All live at `/api/jobs/*`, require a `CRON_SECRET` bearer, and return 404 (not 401) on a bad secret so they aren't discoverable.

**Every job is self-healing.** It queries by state — "all transactions pending
and due for a poll" — never "what changed since the last run." A missed run is
caught by the next one. This matters because cron reliability is now on the
payment critical path.

---

## 7. Trust boundaries

| Boundary                    | Authentication                                  |
| --------------------------- | ----------------------------------------------- |
| Browser → public site       | none                                            |
| Browser → checkout          | session ID in URL (unguessable, expiring)       |
| Browser → admin             | session cookie + password + TOTP                |
| Browser → portal            | session cookie, tenant-scoped at the data layer |
| SaaS backend → `/api/v1`    | `client_id` + secret, scope-checked             |
| Provider → `/api/callbacks` | HMAC signature verification                     |
| Cron/QStash → `/api/jobs`   | `CRON_SECRET` bearer                            |
| App → provider              | secret key or HMAC signature                    |

Nothing crosses a boundary without verification. A redirect back from a
provider carries **no** authority.

---

## 8. Why this shape

**One app, not microservices.** Two founders. Distributed transactions across
services would be a liability, not an asset. The package boundary gives the
separation that matters without the operational cost.

**Serverless, not a VPS.** Confirmed: eSewa authenticates by HMAC signature and
Khalti by secret key. Neither requires IP whitelisting, which was the only hard
blocker. No server to patch is worth real money in founder time.

**Postgres, not a document store.** The balance constraint, immutability
triggers, and gapless invoice numbering are enforced by the database. A bug in
application code cannot corrupt the books. Reporting is SQL, so an accountant
can query it directly.

**Mumbai region.** Functions pinned to `bom1`, database in Mumbai. Nepal to
Mumbai is ~40–60ms. Functions in Virginia with a database in Mumbai would add
~250ms per query.

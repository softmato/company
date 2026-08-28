# Folder Structure

## Root

```
softmato/
├── apps/
│   └── web/
├── packages/
│   ├── db/
│   ├── payment-core/
│   ├── accounting/
│   ├── sdk/
│   ├── ui/
│   └── config/
├── docs/                    ← these files
├── docker-compose.yml       local Postgres + Redis
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## `apps/web`

One Next.js app. Subdomains map to route groups via `middleware.ts`.

```
apps/web/
├── middleware.ts                 subdomain → route group rewriting
├── vercel.json                   { "regions": ["bom1"] }
├── app/
│   ├── (public)/                 softmato.com
│   │   ├── page.tsx              home
│   │   ├── services/
│   │   ├── products/
│   │   ├── team/
│   │   ├── about/
│   │   ├── blog/[slug]/
│   │   ├── careers/
│   │   ├── contact/
│   │   └── legal/[slug]/         terms, privacy, refunds, sla, aup, cookies
│   │
│   ├── (admin)/                  admin.softmato.com
│   │   ├── layout.tsx            session guard + TOTP check
│   │   ├── page.tsx              dashboard
│   │   ├── payments/
│   │   │   ├── page.tsx          transaction list
│   │   │   ├── [id]/             detail + provider event timeline
│   │   │   ├── reconciliation/   amount mismatches awaiting a human
│   │   │   └── refunds/
│   │   ├── invoices/
│   │   ├── customers/
│   │   ├── subscriptions/
│   │   ├── products/             SaaS registration, credentials
│   │   ├── providers/            enable, limits, sandbox toggle
│   │   ├── accounting/
│   │   │   ├── accounts/         chart of accounts
│   │   │   ├── journals/
│   │   │   ├── ledger/
│   │   │   ├── reports/          trial balance, P&L, BS, product P&L
│   │   │   └── periods/          close
│   │   ├── reconciliation/
│   │   ├── cms/                  pages, blog, team, services, legal
│   │   ├── clients/              agency projects
│   │   ├── audit/
│   │   └── settings/
│   │
│   ├── (checkout)/               payment.softmato.com
│   │   └── checkout/[sessionId]/
│   │       ├── page.tsx          method selection
│   │       ├── return/           post-redirect → triggers poll()
│   │       └── status/
│   │
│   ├── (portal)/                 agency.softmato.com
│   │   ├── page.tsx              project overview
│   │   ├── projects/[id]/
│   │   ├── invoices/
│   │   ├── documents/
│   │   └── messages/
│   │
│   └── api/
│       ├── v1/                   SaaS-facing payment API
│       │   ├── invoices/
│       │   ├── checkout/
│       │   ├── transactions/[id]/
│       │   └── refunds/
│       ├── callbacks/            public, signature-verified
│       │   ├── esewa/
│       │   └── fonepay/
│       ├── jobs/                 CRON_SECRET bearer required
│       │   ├── poll-transactions/
│       │   ├── expire-sessions/
│       │   ├── retry-webhooks/
│       │   ├── recognize-revenue/
│       │   ├── generate-renewals/
│       │   ├── send-dunning/
│       │   ├── suspend-past-grace/
│       │   ├── reconcile/
│       │   └── heartbeat/
│       ├── internal/             admin-only mutations
│       ├── auth/[...nextauth]/
│       └── queue/                QStash delivery targets
│
├── components/                   app-specific only; shared → packages/ui
│   ├── admin/
│   ├── checkout/
│   ├── public/
│   └── portal/
├── lib/
│   ├── auth.ts
│   ├── session.ts
│   ├── r2.ts                     presigned URL helpers
│   ├── rate-limit.ts
│   └── format.ts                 formatNPR, BS dates
└── emails/                       react-email templates
```

**Route handlers stay thin.** Parse, authenticate, call into a package,
serialize. Business logic never lives in `app/api/`.

---

## `packages/db`

```
db/
├── schema/
│   ├── accounts.ts
│   ├── ledger.ts             journal_entries, ledger_entries
│   ├── fiscal.ts
│   ├── applications.ts
│   ├── customers.ts
│   ├── invoices.ts
│   ├── payments.ts           sessions, transactions, refunds
│   ├── providers.ts
│   ├── subscriptions.ts
│   ├── reconciliation.ts
│   ├── cms.ts
│   ├── clients.ts
│   ├── audit.ts
│   └── index.ts
├── migrations/               generated, reviewed, committed
├── seed/
│   ├── accounts.ts           chart of accounts
│   ├── fiscal-periods.ts
│   ├── providers.ts
│   └── products.ts
├── client.ts                 driver switch: neon (prod) / pg (local)
└── index.ts
```

Triggers and constraint functions live in hand-written migration files —
Drizzle Kit does not generate them. Never let a regeneration drop them.

---

## `packages/payment-core`

No `next` import. Ever.

```
payment-core/
├── providers/
│   ├── types.ts              PaymentProvider, VerifiedResult
│   ├── manual-qr.ts
│   ├── khalti.ts
│   ├── esewa.ts
│   ├── fonepay.ts
│   └── registry.ts
├── sessions/
│   ├── create.ts             validation, amount recompute, provider routing
│   └── expire.ts
├── transactions/
│   ├── state-machine.ts      legal transitions, enforced
│   ├── process-result.ts     the one place a VerifiedResult becomes truth
│   └── polling.ts
├── refunds/
├── webhooks/
│   ├── sign.ts
│   ├── deliver.ts
│   └── verify-inbound.ts
├── idempotency.ts
├── errors.ts                 PaymentError and codes
└── index.ts
```

`process-result.ts` is the most important file in the repository. Every
confirmation path — callback and polling, every provider — funnels through it.
One place to get right, one place to audit.

---

## `packages/accounting`

No `next` import. Never imports `payment-core`.

```
accounting/
├── post-journal.ts           the core primitive
├── rules/                    one file per posting rule
│   ├── payment-received.ts
│   ├── refund-issued.ts
│   ├── invoice-issued.ts
│   ├── revenue-recognition.ts
│   ├── settlement.ts
│   ├── expense.ts
│   └── payroll.ts
├── periods/
│   ├── resolve.ts            occurredAt → fiscal period
│   └── close.ts
├── reports/
│   ├── trial-balance.ts
│   ├── profit-loss.ts
│   ├── balance-sheet.ts
│   ├── product-pl.ts
│   └── ar-aging.ts
├── numbering.ts              gapless sequences
└── index.ts
```

Each file in `rules/` maps to a numbered section of `CHART_OF_ACCOUNTS.md` §9.
Reference the section in a comment at the top. If a scenario has no rule file,
there is no rule — ask.

---

## `packages/sdk`

What the SaaS products install. Keep the surface small and the docs inline.

```
sdk/
├── client.ts                 createInvoice, createCheckout, getTransaction
├── webhooks.ts               verifySignature — timing-safe
├── types.ts                  shared with the API, single source of truth
└── README.md                 integration guide for a SaaS developer
```

---

## `packages/ui`

Only components used by more than one surface. Everything else stays in
`apps/web/components/`.

```
ui/
├── primitives/               restyled shadcn
├── ledger-table/             the greenbar table — the signature component
├── money.tsx                 formatted NPR, tabular, semantic colour
├── bs-date.tsx
├── status-badge.tsx
└── styles/tokens.css         DESIGN.md tokens as CSS variables
```

---

## Naming

| Thing             | Convention                                          |
| ----------------- | --------------------------------------------------- |
| Files             | `kebab-case.ts`                                     |
| React components  | `PascalCase.tsx`                                    |
| Route folders     | `kebab-case`, route groups `(parens)`               |
| DB tables/columns | `snake_case`                                        |
| TS variables      | `camelCase`                                         |
| Types/interfaces  | `PascalCase`                                        |
| Constants         | `SCREAMING_SNAKE_CASE`                              |
| Money variables   | always suffixed `Minor` — `amountMinor`, `feeMinor` |

That last one is a rule, not a preference. `amount` is ambiguous;
`amountMinor` is not.

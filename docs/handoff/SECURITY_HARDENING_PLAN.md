# Securing the integration surface

A work order, written 2026-09-02, for the session that hardens `/api/v1` and
publishes the integration documentation. **QuestionCall is the first product to
integrate; nothing here depends on it.** We set the standard first, then bend
the product to fit — not the other way round.

Work item by item. Code it, verify it, flip `☐` to `☑`, then move to the next.
Do not batch.

---

## What was already decided, and why

Read this before touching anything; several obvious-looking "improvements" were
considered and rejected on purpose.

**There are no third-party integrators, and the schema cannot represent one.**
`applications.product_id` points at `products`, which holds exactly
`hostelhub`, `questioncall`, `agency`, `corporate` — Softmato's own product
lines. `docs/CHART_OF_ACCOUNTS.md` §8 calls it a ledger dimension: it is what
makes per-product P&L work. And §9.1 posts an issued invoice as
`Dr 1110 AR / Cr 2110 Deferred Revenue` — _Softmato's_ receivable and
_Softmato's_ obligation. There is no partner payable anywhere in the
liabilities section.

So a genuine outside company collecting through this rail would have its money
booked as Softmato revenue, with nowhere to record what we owe them. **Every
application is a Softmato product by construction.** PAN and VAT on every
document are the parent company's, correctly. Self-service registration is
therefore deferred to `future_implementation.md` — it is blocked on a chart of
accounts decision, not on a signup form.

**The money path is already safe. Do not re-engineer it.** Customers pay into
Softmato's own provider accounts. `POST /v1/checkout` has no `amount` field —
the server reads it from the invoice. `callback/page.tsx` ignores every query
parameter a provider appends. `authenticateApplication` fails closed, does
constant work for a missing application, and checks revocation only after
verification so the endpoint cannot be used to enumerate integrators. All of
that is correct and stays.

**What is not protected is where people get sent.** Three doors:

1. `return_url` accepts any https host (`app/api/v1/checkout/route.ts:20`). A
   stolen key lets someone land a paying customer on a lookalike "payment
   failed, try again" page and take a second payment — off a checkout page
   carrying Softmato's name.
2. `webhook_url` is fetched _by our server_ (`webhooks/deliver.ts:178`) with no
   destination restriction. An internal address there turns our own server into
   the attacker's errand boy.
3. Nothing rate limits `/api/v1`. Every request runs an argon2id verify that is
   deliberately slow. A stranger with no credentials can pin the CPU.

The fix for 1 and 2 is the same idea: **the allowed addresses are written down
by an admin, signed in, in advance.** Never sent by the caller, never inferred
from the request. A secret answers "who is this"; the domain list answers "and
where may they send my customer".

**Rate limiting is Vercel's, not Upstash's.** Upstash bills per command, so a
flood costs money to reject. Vercel denies at the edge and denied traffic is
free — it never starts a function, never runs argon2, never opens a Neon
connection. `docs/API.md` §7 and `docs/RULES.md` §7 currently say Upstash and
are now wrong.

**The plan is Hobby-shaped.** Hobby allows **one** rate-limit rule and three
custom firewall rules total, with a counting window between 10s and 10min.

**UI is the primary path. CLI is break-glass.** Every task below must be doable
from `admin.softmato.com` by a signed-in admin. `pnpm app:secret` and
`pnpm webhook:status --reveal` stay, but stop being the way anything is done.

---

## ☑ 0. Preview deployments must stop writing to the production ledger

> **Done 2026-09-03.** The suspicion was correct: `DATABASE_URL` was scoped
> `Production and Preview`, as was every other variable. No preview had ever
> been built — the repo had only ever had a `main` branch — so it was a loaded
> gun rather than a fired one.
>
> The Neon branches, now pinned down: `production` is
> `ep-flat-wildflower-azfujbu5`, `softmato-dev` is `ep-spring-brook-azbbif7k`,
> and the `ep-small-cloud-…` endpoint from the 2026-08-29 outage belongs to
> neither and is gone from the project. Both branches share one role password,
> so the two `DATABASE_URL` values are identical until the host — the Vercel
> list view cannot tell them apart, and they must be revealed to be checked.
>
> `APP_ENV` was split in the same pass and mattered as much: Preview was
> receiving `production`, which disabled all three guards keyed on it —
> `robots.ts` (previews indexable by Google), `seo/site.ts` (Organization
> markup pointing at a vercel.app host), and the `env.ts` refusal to boot a
> preview with `PAYMENT_MODE=live`.
>
> Deliberately left shared, with reasons: `ENCRYPTION_KEY`, because the dev
> branch holds 3 admin TOTP secrets and an application webhook secret
> encrypted with it, and a separate key makes them unreadable rather than
> merely separate. `AUTH_SECRET` and `CRON_SECRET` can be split at any time and
> should be. `RESEND_API_KEY` is worth removing from Preview entirely, since
> email degrades quietly and a preview then cannot mail a real customer.
>
> Known and not fixed: `AUTH_URL`, `NEXT_PUBLIC_APP_URL` and
> `NEXT_PUBLIC_CHECKOUT_URL` are required, static, and point at softmato.com on
> both, so signing in on a preview redirects to production. Navigate back by
> hand. Preview deployments also have no subdomains — `*.vercel.app` covers one
> label, so `admin.<deployment>.vercel.app` fails TLS before reaching the app.
> Use the paths: `/login`, then `/admin/...`, which `proxy.ts` lets through
> unrewritten on the public surface.

**Vercel dashboard, no code. Do this first — it is the only item here that can
silently corrupt the accounts.**

`DATABASE_URL` is set on Vercel from the production env. On Vercel a variable
added without unchecking environments applies to Production, Preview **and**
Development. If that is what happened, every preview deployment reads and writes
the live ledger — and no login screen helps, because the danger is our own code:
a preview build carrying a new migration, a seed script, or a test that posts a
journal entry.

1. Project Settings → Environment Variables. Scope the existing `DATABASE_URL`
   to **Production only**.
2. Add a second `DATABASE_URL` scoped to **Preview**, pointing at the dev Neon
   branch (the URL already in the local `.env.local`).
3. Settings → Deployment Protection: confirm **Vercel Authentication** with
   **Standard Protection** is still on. It is available on Hobby, is the default
   for new projects, and covers API routes as well as pages.

**Verify:** open a preview deployment's `/api/v1/invoices` — it must be
challenged by Vercel Authentication, and once past it, must be talking to the
dev branch. Confirm by creating a row in dev and reading it back through the
preview URL.

**How it was verified, 2026-09-03.** Three checks, each proving one thing:

1. _Protection._ An unauthenticated `curl` of the preview redirected to
   `vercel.com/login?next=/sso-api…`; even `/robots.txt` was gated. It renders
   in the founder's browser only because a signed-in team member passes
   transparently — so this must be checked from outside that session.
2. _`APP_ENV`._ The preview's `/robots.txt` returned `User-Agent: *` /
   `Disallow: /`; production's returned the full allow-list with
   `Host: https://softmato.com`.
3. _`DATABASE_URL`._ Migration `0006` was applied to the dev branch only, then
   `/admin/applications/1` was opened on the preview: the Registered domains
   section rendered, which it cannot do where `application_domains` is absent.
   The same screen on production failed until `0006` was applied there too.

A branch push whose commit is identical to `main` builds nothing — Vercel
deduplicates by commit SHA and reuses the existing deployment. An empty commit
is what forces a preview to exist.

---

## ☐ 1. The one rate-limit rule

> **Not done — cannot be done from here.** Vercel dashboard, no code. The
> documentation in `docs/API.md` §7 has been corrected to describe this rule as
> the built layer and per-application limits as deferred, so the docs now
> describe the intended end state; the rule itself still has to be created.

**Vercel dashboard, no code.**

Firewall → New Rule:

- Condition: **Request Path** starts with `/api/v1`
- Action: **Rate Limit**, Fixed Window
- Key: **IP**
- Window `60s`, limit `600`
- Then: **Deny** (429)

Start it on **Log** for 24 hours to confirm it catches nothing legitimate, then
switch to Deny and Publish. That is the one place warn-first earns its keep in
this plan, because the limit is a guess and traffic is real.

Per-application limits (the table in `docs/API.md` §7) are **not** built here.
They need `@vercel/firewall`'s `checkRateLimit` with `rateLimitKey` set to the
`client_id`, which runs inside the function and so cannot stop a flood anyway,
and a second rule we do not have on Hobby. It is item 1 of
`future_implementation.md`.

**Verify:** 700 requests in a minute from one IP; the tail returns 429 and the
Firewall overview shows them.

---

## ☑ 2. `application_domains` — the allowlist

**New table.** Migration in `packages/db/migrations`, schema in
`packages/db/schema/applications.ts` beside the table it belongs to.

    application_domains
      id              bigint identity pk
      application_id  bigint not null → applications(id) on delete cascade
      hostname        text not null     -- 'questioncall.com', lowercase, no scheme/port/path
      note            text              -- why it is on the list, for the admin reading it in a year
      created_at      timestamptz not null default now()
      created_by      text              -- the admin who added it
      unique (application_id, hostname)

Rules, all enforced in the database or at the single validation helper — never
remembered at a call site:

- Hostname is stored lowercase, punycode, with no scheme, port or path. A CHECK
  constraint rejects anything containing `/`, `:` or uppercase.
- **No wildcards.** `*.questioncall.com` is not accepted. A wildcard is how an
  allowlist quietly becomes an allow-anything the day someone loses control of a
  subdomain. List the subdomains.
- Matching is **exact hostname equality**, never `endsWith`. `endsWith` on
  `questioncall.com` matches `evilquestioncall.com`.

**One validation helper**, in `packages/payment-core/applications/domains.ts`,
used by both consumers:

    assertRegisteredHost(applicationId, url): Promise<void>

Throws `PaymentError('VALIDATION_FAILED', …)` naming the field and the hostname
that was refused — a caller must be able to fix this without asking us. Require
`https:` here too, so the scheme check stops living in a zod schema in the route
file.

Wire it into:

- `app/api/v1/checkout/route.ts` — on `return_url`, before `createSession`.
- Wherever `webhook_url` is written. **Both** the admin form from item 4 and any
  remaining script path. A webhook URL that skipped validation because it came
  in through the back door is the whole bug.

**Enforce from day one.** No warn mode: there are no live integrators to break,
so warn mode would be a migration path from nothing to nothing.

**Verify:** a `return_url` on an unregistered host returns 422 naming the host;
the same URL on a registered host succeeds; the `endsWith` bypass
(`evilquestioncall.com` against a `questioncall.com` entry) is refused. Unit
tests on the helper, not just an integration test through the route.

---

## ☑ 3. The second hop — hand the customer back

Today `return_url` is **stored and never read**. Nothing sends the customer
anywhere. Hop one already exists and is right: the customer lands on our own
`checkout/[sessionId]/callback` page, which ignores every provider query
parameter and asks the provider directly. Keep that exactly as it is.

Add hop two: from that page, a way back to the product.

- Pass the session's `return_url` and the application's `name` into
  `CheckoutNotice`, and render a link — _"Return to QuestionCall"_.
- **A link the customer clicks, not an automatic redirect.** That page renders
  five outcomes, three of which are not "paid" — pending, under review, not
  completed. Auto-forwarding would rush someone past _"This payment is being
  reviewed, please do not pay again"_, which the existing comments in that file
  care about for good reason. The button appears on every outcome; only the
  label around it changes.
- Re-check the host against `application_domains` at render time, not only at
  creation time. A domain removed after a session was created must not still be
  linkable.
- No payment result in the URL. The product learns what happened from the
  webhook, never from a query parameter we hand the customer — that is the
  invariant the callback page already protects and it must survive this change.
- `return_url` absent → no button, page renders as it does today.

**Verify:** paid session shows the link and it goes to the registered host;
delete the domain row and reload — the link is gone; the URL carries no status
parameter.

---

## ☑ 4. Applications, in the admin panel

There is **no applications screen today** — the admin surface has audit, cms,
invoices, leads, payments, products, receipts, reconciliation, refunds,
security, settings and subscriptions. Build it at
`app/(admin)/admin/applications`, following the patterns those neighbours use.

**List** — name, product, client id, live/sandbox, scopes, secret last 4,
rotation and revocation state, domain count.

**New application** — one form, one act:

- name, product (select from `products`), live or sandbox, scopes (checkboxes
  from `APPLICATION_SCOPES`)
- webhook URL
- **domains** — at least one, captured here rather than in a second screen, so
  an application cannot exist for even a moment without its allowlist
- on save: generate the client secret and the webhook secret, show **both
  once**, on one page, with an explicit "I have copied these" acknowledgement
  before navigating away. They are different credentials and neither works in
  the other's place — say so on that page, because that is the mistake this will
  otherwise generate a support thread about.

**Per-application actions** — rotate secret (24h overlap, as
`authenticateApplication` already implements), reveal and rotate the webhook
secret, revoke, add and remove domains.

Every one of these writes an `audit_logs` row. Reveal is an event worth
recording, not just a read.

Reauthentication: follow whatever `app/(admin)/admin/security/reauth.ts` already
does for sensitive actions. Minting a live credential belongs in the same class
as changing an admin password.

`pnpm app:secret` and `pnpm webhook:status` stay as break-glass. Add a line to
each script's header saying the admin panel is the normal path.

**Verify:** create an application end to end from the UI, use the secret it
prints against `/api/v1/invoices`, rotate it, confirm the old one still works
inside the overlap and fails after it, revoke and confirm 401.

---

## ☑ 5. `/developers` — the public documentation

A real route under `(public)/(site)`, rendering `docs/INTEGRATION.md` **from
git**, not from the CMS. Developer documentation that a non-engineer can edit
drifts from the code; legal documents need editing without a deploy. That is the
line, and it is deliberate.

- Reuse the legal page's furniture — `Markdown`, `PageHeader`,
  `extractHeadings`, `TocRail` / `TocInline`. This is the same shape of page.
- Read the markdown at build time. No CMS query, no database.
- Add a section to `docs/INTEGRATION.md` — **"Connecting securely"** — covering
  what the caller must do: the secret is server-side only and never in a browser
  or a mobile app; verify the webhook signature before reading any field; the
  registered-domain rule and what a 422 from it means; the rate limit and what a
  429 means; rotation; provision on `payment.success` or a verified
  `getTransaction`, never on an invoice existing or on a return URL.
- Link it from the footer under Company, and from `/legal/partner-terms`.

**Verify:** the page renders, its table of contents works, and editing the
markdown changes it after a build.

---

## ☑ 6. `/legal/partner-terms`

A new legal document, seeded exactly like its six siblings: a file at
`packages/db/seed/legal/partner-terms.ts` exporting a `LegalDocumentSeed`,
registered in `packages/db/seed/legal/index.ts`. Seeded `draft` with no
`effectiveAt` — the database refuses to publish a legal document without an
effective date, and publishing is the founder's call. The footer picks it up
automatically once published (`site-footer.tsx:97`, sorted by slug).

**Draft the technical clauses only.** Each of these is enforced by code that
exists after this plan, so it is a description of the system, not a promise:

- Credentials are per application, not shared, and are not sub-licensed.
- Return and webhook addresses must be registered in advance; unregistered ones
  are refused.
- Provision on a verified payment, never on an invoice existing or a return
  URL's parameters.
- Verify the webhook signature before reading any field.
- Invoice contents must match what the customer bought; `presentation` may not
  contradict the amount.
- Refunds and disputes go through Softmato, not settled out of band.
- What may be retained from our responses, and for how long.
- Suspension: what costs credentials, and with what notice.

End it with a link to `/developers`.

**The commercial half — liability, indemnity, termination, governing law — is
not ours to write.** Leave a clearly marked `[confirm: …]` block; that marker
already keeps a document out of search engines via `lib/cms/legal-readiness.ts`
and is caught by `pnpm legal:check` before deploy. Do not invent legal text to
fill it.

---

## ☑ 7. `future_implementation.md`

At the repository root. Numbered, so items can be referred to. Contents:

> # Future implementation
>
> Decided, deliberately not built yet. Each entry says what unblocks it.
>
> ## 1. Per-application rate limiting
>
> The table in `docs/API.md` §7 — 60/min on `POST /v1/checkout`, 300/min on
> `GET /v1/*`, per application. Built with `@vercel/firewall`'s
> `checkRateLimit`, called in `apps/web/lib/api/route.ts` after
> `authenticateApplication` succeeds, with `rateLimitKey` set to the
> `client_id`. Put it behind one module so leaving Vercel is a one-file change,
> and make it a no-op locally and in CI where there is no firewall.
>
> **Blocked on:** Vercel Pro. Hobby allows one rate-limit rule per project and
> that one is spent on the edge IP rule, which matters more — it stops a flood
> before a function starts, and denied traffic is free.
>
> **Also worth having then:** the `RATE_LIMITED` / 429 response with
> `Retry-After`, which the error table already reserves a code for.
>
> ## 2. Third-party SaaS onboarding
>
> Self-service sandbox credentials, with a human approving live ones: a signup
> form creates an application with `is_live = false`, the developer builds
> against sandbox immediately, then requests live access and submits company
> details and domains for review.
>
> **Blocked on accounting, not engineering.** Every application today is a
> Softmato product, and an issued invoice posts `Dr 1110 AR / Cr 2110 Deferred
Revenue` — our receivable, our obligation, our PAN. There is no partner
> payable in the chart of accounts, so money collected for an outside company
> would be booked as our revenue with nowhere to record what we owe. Needs a
> partner payable account, a revenue-share model, and a decision about whose PAN
> goes on the invoice. Founder and accountant, then this.
>
> ## 3. Platform-driven renewals
>
> `saas-implementation.md` §3. The `subscriptions` table was designed for it and
> nothing writes to it. Revisit when a second integrator makes us write the same
> nightly job twice.

---

## ☑ 8. Correct the documentation that this makes wrong

- `docs/API.md` §7 — Upstash becomes Vercel; say which layer is built and which
  is deferred, and point at `future_implementation.md` §1.
- `docs/RULES.md` §7 — remove `@upstash/ratelimit` from the dependency table.
- `docs/API.md` §2 — add the registered-domain requirement beside scopes and
  rotation. Someone reading the authentication section must learn there that a
  credential alone is not sufficient.
- `docs/API.md` §3 — `return_url` must be on a registered host.
- `docs/DATABASE.md` — `application_domains`.
- `saas-implementation.md` — **append**, do not rewrite. Record that §4 was
  settled as deferred and why, and that §5's page is now `/legal/partner-terms`
  plus `/developers`.

---

## Done when

- A preview deployment cannot reach the production database.
- A flood of unauthenticated requests to `/api/v1` is refused at the edge and
  never reaches argon2.
- A `return_url` or `webhook_url` on an unregistered host is refused with a 422
  naming the host, whether it arrives through the API or the admin form.
- A paid customer lands on our page and returns to the product by clicking a
  link, with no payment status in the URL.
- An application can be created, rotated, revoked, and have its domains changed,
  entirely from the admin panel, with an audit row for each.
- `/developers` and `/legal/partner-terms` are both reachable from the footer,
  and each links to the other.
- `pnpm typecheck && pnpm test && pnpm legal:check` passes.

## Open, and needed before item 2 ships

- **QuestionCall's hostnames.** Every host a return URL can land on and the
  webhook endpoint sits on — apex, `www`, and any `app`/`api` subdomain.
  Over-list rather than be locked out on launch day.
- **Whether the Vercel plan is still Hobby** when this is built. If it is Pro,
  item 1 of `future_implementation.md` can be pulled forward into this plan.

---

## Session record — 2026-09-02

Items 2 through 8 are implemented, typechecked, linted and tested. Items 0 and
1 are Vercel dashboard configuration and were not attempted.

### Corrections to this plan, found while implementing it

- **"There is no applications screen today" was wrong.** The full credential
  lifecycle already existed inside `/admin/products` — `registerApplication`,
  rotate, revoke, `ApplicationPanel`, `RegisterApplicationForm`. Rather than
  build a second one, that UI moved to `/admin/applications` and the products
  page now counts applications and links out. There is one screen that mints
  credentials, not two.
- **The 422 could not name the host.** `apiError` deliberately answers from a
  fixed table keyed by error code, "never from the thrown error" — so the
  carefully worded refusal this plan asks for would have been flattened to
  "The request body failed validation". Rather than weaken that rule,
  `PaymentError` gained an opt-in fourth argument, `publicDetail`, serialised
  as a separate `detail` field. `message` still comes from the table; a
  specific sentence now has to be written deliberately at the throw site.
- **The shape check alone did not stop SSRF.** A unit test caught it:
  `169.254.169.254` — the cloud metadata address — is four perfectly legal
  LDH labels and passed the hostname pattern. The fix is a separate rule, in
  both the normaliser and the CHECK constraint: no all-numeric final label.
  `new URL()` canonicalises every IPv4 encoding (`2130706433`, `0x7f000001`,
  `127.1`) to dotted decimal first, so one rule covers them all.
- **Next 16 has no `middleware.ts`.** The subdomain rewriting this needed
  already existed in `apps/web/proxy.ts`, which already maps
  `admin.softmato.com` and `payment.softmato.com`. The documentation host was
  added there.

### Decisions taken with the founder

- Developer documentation is served at **`developer.softmato.com`**, as a
  rewrite of `/developers` in `proxy.ts`. The path stays canonical and keeps
  working, because it is the only address that exists locally and in previews.
  **The DNS record and the Vercel domain still have to be added** — until then
  the subdomain is inert and the path is the only way in.
- **No credential-provisioning API.** Registration is admin-session only, with
  re-authentication before a live credential is minted. Recorded, with the
  reasoning, as `future_implementation.md` §4.
- Vercel is on **Hobby**, so per-application rate limiting stays deferred as
  `future_implementation.md` §1.

### Not verified, and why

The migration (`0006_application_domains`) has **not been applied to any
database**, and `partner-terms` has **not been seeded**. The only reachable
database from here is a Neon instance whose branch could not be confirmed as
the development one, and item 0 — the separation that would make that safe —
is still open. Running either against production is exactly what item 0 exists
to prevent.

So these remain to be verified by hand, after item 0:

1. `pnpm db:migrate` against the dev branch, then confirm the CHECK rejects
   `169.254.169.254`, `*.questioncall.com`, and `Questioncall.com`.
2. `pnpm legal:refresh` to seed `partner-terms`; `pnpm legal:check` must then
   report it as **blocking publication** with 2 `[confirm:]` markers. That is
   the guard working, not a failure.
3. The end-to-end 422: a `return_url` on an unregistered host, and the
   `evilquestioncall.com`-against-`questioncall.com` bypass attempt.

### Added beyond the plan, on the founder's instruction

- **The docs say who they are for.** `/developers` is a public URL, and the
  reader it could most easily mislead is an outside developer hunting for a
  sign-up button. `docs/INTEGRATION.md` now opens with "Who this is for" —
  internal guide, Softmato product teams, no self-service API — and points
  everyone else at `/contact`, because for an outside company the answer is
  that we build it for them. The page repeats the short version as a callout
  above the fold, since a body section is exactly what a skimmer misses.

- **`@softmato/sdk` can now actually be installed.** The guide told a product
  team to `import { SoftmatoClient } from '@softmato/sdk'` and never said how,
  because there was no how: the package was `"private": true`, version
  `0.0.0`, with `main` pointing at raw `index.ts`. It worked only through
  `workspace:*` inside this repository — so QuestionCall, in its own repo,
  could not install it at all.

  It now builds to `dist/` and publishes **privately to GitHub Packages** under
  the `softmato` org (`.github/workflows/publish-sdk.yml`, on an `sdk-v*`
  tag). `publishConfig` rewrites `main`/`types`/`exports` to `dist/` in the
  tarball only, so the workspace keeps importing TypeScript source and there is
  no `dist/` to fall out of step with the code beside it.

  **A latent bug surfaced doing this:** the SDK's relative imports were
  extensionless (`from './client'`). A bundler resolves that; Node's ESM
  resolver does not, so the published package would have failed on import with
  every test in this repository still green. They now carry `.js`. Verified by
  packing the tarball, installing it into a clean project, and importing it
  from plain Node — signature verification and tamper rejection both work, and
  the types correctly reject an `amount` field on checkout.

### Still open

**QuestionCall's hostnames.** `D:\Jiwan-Mijhar` commits no production
hostname — `web/.env.example` carries only `http://localhost:3000`. Nothing was
invented. The founder supplies the real list, and it goes in through
`/admin/applications` when the application is registered.

**The SDK has never been published.** The workflow is written and the package
is ready, but no `sdk-v*` tag exists yet, so `@softmato/sdk@0.1.0` is not in
GitHub Packages. Until it is, the install instructions in
`docs/INTEGRATION.md` describe something that is not there. Tag and push when
ready:

    git tag sdk-v0.1.0 && git push origin sdk-v0.1.0

**QuestionCall needs a read token.** A GitHub PAT with `read:packages`, set as
`GITHUB_TOKEN` in its CI and on its Vercel project, plus the two-line `.npmrc`
from `docs/INTEGRATION.md` §Installing the SDK.

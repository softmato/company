# Future implementation

Decided, deliberately not built yet. Each entry says what unblocks it.

Numbered so they can be referred to from code comments and from
`docs/API.md`. Do not renumber; append.

## 1. Per-application rate limiting

The table in `docs/API.md` §7 — 60/min on `POST /v1/checkout`, 300/min on
`GET /v1/*`, per application. Built with `@vercel/firewall`'s `checkRateLimit`,
called in `apps/web/lib/api/route.ts` after `authenticateApplication` succeeds,
with `rateLimitKey` set to the `client_id`. Put it behind one module so leaving
Vercel is a one-file change, and make it a no-op locally and in CI where there
is no firewall.

**Blocked on:** Vercel Pro. Hobby allows one rate-limit rule per project and
that one is spent on the edge IP rule, which matters more — it stops a flood
before a function starts, and denied traffic is free.

**Also worth having then:** the `RATE_LIMITED` / 429 response with
`Retry-After`, which the error table already reserves a code for.

## 2. Third-party SaaS onboarding

Self-service sandbox credentials, with a human approving live ones: a signup
form creates an application with `is_live = false`, the developer builds against
sandbox immediately, then requests live access and submits company details and
domains for review.

**Blocked on accounting, not engineering.** Every application today is a
Softmato product, and an issued invoice posts `Dr 1110 AR / Cr 2110 Deferred
Revenue` — our receivable, our obligation, our PAN. There is no partner payable
in the chart of accounts, so money collected for an outside company would be
booked as our revenue with nowhere to record what we owe. Needs a partner
payable account, a revenue-share model, and a decision about whose PAN goes on
the invoice. Founder and accountant, then this.

Note what is _not_ blocking it: the credential machinery is done. Registering an
application, minting both secrets, capturing a domain allowlist, rotating,
revoking and auditing all exist at `/admin/applications` and would be the same
work done by a different actor. What is missing is the ledger, not the form.

## 3. Platform-driven renewals

`saas-implementation.md` §3. The `subscriptions` table was designed for it and
nothing writes to it. Revisit when a second integrator makes us write the same
nightly job twice.

## 4. A credential-provisioning API

An endpoint that registers an application without an admin at a keyboard, for
scripting environment setup.

**Deliberately not built, and not merely deferred.** Nothing on `/api/v1` can
mint a credential today, which means a leaked product secret cannot be
escalated into a _new_ application with a _new_ domain allowlist — the
allowlist is only a control while the caller cannot edit it. An API that mints
credentials needs a credential that mints credentials, and that key becomes the
single thing whose compromise bypasses every control in
`docs/handoff/SECURITY_HARDENING_PLAN.md`.

If it is ever wanted, the shape that keeps the property: sandbox only
(`is_live = false`), a separate scope, and live credentials still requiring a
signed-in admin with re-authentication.

## 5. Automatic domain verification

Proving that whoever registers `questioncall.com` controls it — a DNS TXT
record or a well-known path — before it is added to an allowlist.

**Not needed while every application is ours.** An admin adding a domain to our
own product is not a party we need to verify. It becomes necessary on the same
day as item 2, and for the same reason: at that point the person naming the
domain is no longer the person who owns the platform.

# Fixing the integration surface

A work order, written 2026-09-03, for the session that makes `@softmato/sdk`
usable by a real integrator and rebuilds the credential screens around a
Sandbox / Production split.

**QuestionCall is the first integrator and has one sandbox application already
registered** (`app_test_questioncall_f3kv9zgz`, product `questioncall`, domain
`questioncall.com`, four scopes, no webhook URL set). Nothing here may break
that row.

Work item by item. Build it, verify it, flip `☐` to `☑`, then move on. Do not
batch. The items are ordered so the small independent fixes land before the
schema change, and the UI lands after the schema it draws.

---

## Read first

- `docs/handoff/SECURITY_HARDENING_PLAN.md` — the plan this one continues. All
  nine of its items are done. Its rules still bind, especially: the domain
  allowlist is written by an admin in advance and never taken from a request,
  and the UI is the primary path with the CLI as break-glass.
- `docs/INTEGRATION.md` — the public guide, served at `/developers` and at
  `developer.softmato.com` (live since 2026-09-03).
- `docs/API.md` — the endpoint contract.
- `packages/sdk/client.ts` — the client an integrator installs.
- `docs/MEMORY.md` "Current status" — the running state, including the three
  SDK defects listed below.

---

## The one thing that is not what it looks like

**`is_live` is only a label. It isolates nothing.**

This has to be understood before touching the credential screens, because the
screens are about to make the Sandbox / Production distinction much more
prominent, and a prominent lie is worse than a quiet one.

Today `is_live` is read in exactly two places:

1. `generateClientId()` — picks the `app_test_` or `app_live_` prefix.
2. `generateSessionId()` — picks the `cs_test_` or `cs_live_` prefix.

That is the entire list. It does not choose a payment provider, does not
change which gateway is called, and does not keep anything out of the ledger.
What actually decides whether real money moves is `PAYMENT_MODE`, an
environment variable read at boot in `apps/web/lib/payments/providers.ts`,
which is deployment-wide.

**So a "sandbox" credential used against the production deployment takes real
money through real gateways and posts real journal entries.** The only genuine
isolation that exists is the one built in the last session: the preview
deployment, which has its own Neon branch and its own `PAYMENT_MODE`.

Two consequences for this plan:

- The UI must say what a Sandbox credential actually is — a credential for
  use against a non-production deployment — and must not imply that using one
  on production is safe.
- Making `is_live` load-bearing (per-application payment mode, test money kept
  out of the trial balance) is **out of scope here** and written up at the end
  as an open decision. It is a change to the money path and to the accounts,
  and it needs the founder, not a guess.

---

## What was already decided, and why

Read this before proposing something different.

**Build the two missing endpoints, do not strip the SDK methods.** Decided by
the founder 2026-09-03. `getTransaction()` and `requestRefund()` stay in the
client and gain the routes they call.

**The base URL becomes `https://softmato.com/api/v1`.** Decided by the founder
2026-09-03, over standing up `api.payment.softmato.com` in Vercel. The apex
already serves the API correctly — an unauthenticated `POST` to
`https://softmato.com/api/v1/invoices` returns 401, which is the right refusal.
The `api.payment` host has a DNS record pointing at Vercel but no certificate,
so TLS fails before any request is made.

**Do not add re-authentication where an admin is already signed in.** Decided
by the founder 2026-09-03. Revealing a Sandbox signing secret should not demand
a password and a TOTP code. Production stays gated. See item 4 for the exact
map — it is not "less security", it is moving the gate from where it does
nothing to where it does something.

**One application holds both credential sets.** An admin registers
QuestionCall once and mints a Sandbox credential at registration; the
Production credential is minted later, from the same page, and either can be
rotated at any time. This is item 5 and it is the largest change here.

**Vocabulary: `test` / `live` in identifiers, Sandbox / Production in every
word a human reads.** The identifier prefixes are already minted into issued
client ids and cannot change without invalidating them. Everything a person
reads uses the other pair, with no exceptions.

---

## ☑ 1. Correct the base URL

> **Done 2026-09-03.** All three files now say `https://softmato.com/api/v1`.
> `docs/API.md:10` also loses its "(routed to `/api/v1/*`)" parenthesis, which
> only made sense while the base URL was a different host. `baseUrl` on
> `SoftmatoOptions` is untouched.
>
> The other two occurrences of the old host — `docs/MEMORY.md:45` and this
> plan's own "What was already decided" section — are prose *about* the defect
> and were deliberately left alone.
>
> **Verified as the plan asks, from outside the repository.** `pnpm pack` in
> `packages/sdk`, tarball installed into an empty npm project in the
> scratchpad, then a client built with **no `baseUrl`** and a deliberately bad
> secret:
>
>     name       : SoftmatoApiError
>     status     : 401
>     code       : UNAUTHENTICATED
>     message    : Authentication failed
>     request_id : req_01M1KE5NYNCRQXV7748CA19HDX
>
> A `401` carrying a server-issued request id — not a connection error, not a
> TLS failure — proves the host, the certificate and the route are all real.
> `curl` against the same URL agrees: `status=401 ssl_verify_result=0`.
>
> **Use `pnpm pack`, not `npm pack`, if you repeat this.** The `main`, `types`
> and `exports` rewrites live in `publishConfig`, and that override is a pnpm
> feature — `npm pack` leaves the manifest pointing at `./index.ts`, which is
> not in the tarball, so the import fails with `ERR_MODULE_NOT_FOUND`. That is
> an artefact of the wrong packer, **not** a defect in the published package:
> `.github/workflows/publish-sdk.yml` publishes with
> `pnpm --filter @softmato/sdk publish`, so `0.1.0` on GitHub Packages resolves
> to `dist/index.js` correctly.

**Three files say the same wrong thing.**

- `packages/sdk/client.ts:52` — `DEFAULT_BASE_URL`
- `docs/API.md:10`
- `docs/handoff/BILLING_BRIEF.md:69`

All three become `https://softmato.com/api/v1`.

Leave the `baseUrl` option on `SoftmatoOptions` exactly as it is — an
integrator pointing at a preview deployment needs it, and so does the local
test suite.

**Verify:** from a clean directory outside this repository, with the published
tarball installed, construct a client with no `baseUrl` and call
`createInvoice` with a bad secret. A `401` proves the host, the TLS and the
route are all real. A connection error means the URL is still wrong.

---

## ☑ 2. Build `GET /v1/transactions/{id}`

> **Done 2026-09-03.** Four files:
>
> - `packages/payment-core/transactions/view.ts` — `findTransactionView`, the
>   read. `ownerApplicationId` is a **required** parameter, not the optional
>   one its document siblings take: those are also rendered by the admin panel,
>   where there is no owner to enforce, and this is not. A read with no owner
>   would be a read of every integrator's payments, so it is made impossible to
>   express rather than left to be remembered.
> - `apps/web/app/api/v1/transactions/[...txnId]/route.ts` — catch-all, same
>   `joinReference` as its receipt sibling, no `?format=`: a transaction is a
>   state, not a document.
> - `apps/web/lib/api/serialize.ts` — `serializeTransaction` was **dead code**,
>   declared and never called anywhere, evidently written in anticipation of
>   this endpoint. Repointed as `serializeTransactionView` rather than left to
>   drift beside a second one.
> - `packages/db/tests/transaction-view.test.ts` — four cases, real Postgres.
>
> **The status vocabulary matches the webhook**, as the plan requires:
> `.toUpperCase()` on the enum value, exactly what `buildPayload` does, so no
> third vocabulary was invented. `docs/API.md` §3 now lists all ten, including
> the two — `REVERSED` and `RECONCILIATION_REQUIRED` — that never arrive as a
> webhook and can only be seen here.
>
> **The SDK type gained two fields and lost none.** `TransactionView` in
> `packages/sdk/types.ts` now also declares `net_amount_minor` and
> `refunded_amount_minor`, because the row carries both and an integrator
> reconciling a payout needs the net. `status` narrowed from `string` to a new
> exported `TransactionStatus` union. Nothing moved or was renamed.
>
> **Verified over real HTTP, not just at the query.** Two throwaway sandbox
> applications were registered on the `softmato-dev` branch, each with one
> settled payment, and the running dev server answered:
>
>     own transaction              200
>     another application's        404
>     no such transaction          404
>
> The two 404s are **107 bytes each and identical** once the request id is
> blanked, and their headers are identical too — checked with `diff`, not by
> eye. The route has no way to tell the two cases apart, rather than a rule
> saying it must not: `findTransactionView` returns `undefined` for both.
>
> The throwaway applications and their domains were deleted afterwards; their
> settled transactions were left in place with `application_id` nulled, because
> deleting a payment out from under a posted journal is the thing global
> teardown exists to catch.
>
> `pnpm typecheck`, `pnpm lint` and `pnpm turbo run test --force` all pass —
> 101 database tests.

The SDK's `getTransaction()` calls it and it does not exist. Scope:
`payment:read`.

Model it on `apps/web/app/api/v1/receipts/[...txnNo]/route.ts` — same
catch-all segment problem, because a transaction number contains a slash
(`TXN-2083/84-00000008`), same `joinReference` helper, same
`readEndpoint('payment:read', …)` wrapper.

Rules it must follow:

- **Scoped to the calling application.** A transaction belonging to another
  integrator answers `RESOURCE_NOT_FOUND`, identically to one that does not
  exist. Never distinguish the two.
- Return the shape `TransactionView` in `packages/sdk/types.ts` already
  declares. If the declared shape and the natural response disagree, change
  the SDK type — but write down which fields moved.
- Do not invent a status vocabulary. Use the same uppercase status strings the
  webhook payload uses (`buildPayload` in
  `packages/payment-core/webhooks/events.ts`), so a consumer branching on a
  webhook and a consumer branching on this endpoint branch on the same words.

**Verify:** with QuestionCall's sandbox credential, fetch a transaction that
belongs to it (200), one that belongs to another application (404), and one
that does not exist (404) — and confirm the last two responses are byte
identical apart from the request id.

---

## ☑ 3. Build `POST /v1/refunds`

> **Done 2026-09-03.** It files a request and nothing more, as specified.
>
> - `packages/payment-core/refunds/request.ts` — `requestRefund`. Takes the
>   open transaction, for the same two reasons `startPayment` does.
> - `apps/web/app/api/v1/refunds/route.ts` — `mutatingEndpoint`, so the
>   `Idempotency-Key` requirement and the transaction come from the shared
>   layer rather than from here.
> - `packages/accounting/numbering.ts` — a fourth `SequenceKind`, `RFD`, width
>   6 over `refunds.refund_no`. **The fiscal year is the one the request is
>   filed in, not the year of the payment it refunds**, which showed up
>   immediately in the HTTP check: a probe against a payment in the fake 1975
>   year produced `RFD-2083/84-000001`. That is right, and it is now stated in
>   `docs/API.md`.
> - `packages/db/tests/refund-request.test.ts` — nine cases.
>
> **`refund:request` stays out of `DEFAULT_APPLICATION_SCOPES`**, as the plan
> recommends. The SDK method's doc comment now says so, so an integrator whose
> call 403s knows to ask rather than to file a bug.
>
> **The response carries a `note` field** saying in a sentence that no money
> has moved and an admin must approve it. It is in the body rather than only in
> the docs because the mistake it prevents is made by a person reading a field
> name — `status: "requested"` read as "refund created". `RefundRequest` in the
> SDK declares it, plus `currency` and `reason`; nothing was removed.
>
> **`requested_by` is left null.** It is an admin id column and no admin filed
> this. Worth knowing for whoever builds approval: with `requested_by` null,
> `refund_needs_second_person` is satisfiable by a single admin approving an
> API-filed request, because `approved_by IS DISTINCT FROM NULL` is true. That
> is arguably correct — the integrator *is* the second person — but it is a
> consequence nobody chose, so it is written down here rather than discovered.
>
> **Verified over real HTTP** against the dev branch, with a throwaway
> credential holding `refund:request`:
>
>     succeeded transaction        201, status "requested"
>     another application's        404
>     never succeeded              422, detail "… is PENDING. Only a payment
>                                  that has succeeded can be refunded."
>     same Idempotency-Key twice   201 twice, one row
>
> The idempotent replay is the **same JSON document** but not the same bytes:
> the stored response is `jsonb`, and Postgres does not preserve key order. Key
> set and every value match. That is the shared idempotency layer's behaviour
> on every mutating endpoint, not something this route introduced, and it is
> left alone.
>
> Probe fixtures were deleted afterwards — refunds, applications, domains and
> idempotency keys. The dev branch holds no refunds and one application
> (`HostelHub sandbox`), which is what it held before.
>
> **One pre-existing test had to be fixed, and it was a real defect.**
> `payment-complete.test.ts`'s "leaves every journal this suite posted
> balanced" selected the journals in the shared 1975 fiscal year and then
> fetched each one's lines **in a loop** — one Neon round trip per journal. The
> rows in that year are deliberately never deleted, so the loop grows with
> every run of the suite, and adding two suites that settle payments there
> pushed it past the 30-second timeout. Replaced with one aggregate query
> asking for the unbalanced journals, which is the same assertion and is what
> `v_unbalanced_journals` already does. It would have failed on its own before
> long.
>
> `pnpm typecheck`, `pnpm lint` and `pnpm turbo run test --force` all pass —
> 550 tests across six packages.

The SDK's `requestRefund()` calls it and it does not exist. Scope:
`refund:request` — which is currently a dead scope, and this is what makes it
live. Update `DEFAULT_APPLICATION_SCOPES` only if the founder wants it on by
default; the recommendation is to leave it off, since most integrations never
call it.

**Be honest about what this endpoint can and cannot do.** It files a request.
It does not move money. Two things stand in the way and both are correct:

- No provider adapter implements `refund()` — removed in `todo.md` §0.8
  because the implementations were guesses.
- The `refund_needs_second_person` CHECK constraint on `refunds` forbids
  `approved`, `pending` and `succeeded` unless `approved_by` is set and differs
  from `requested_by`. A single founder cannot satisfy it. That is deliberate
  and stays.

So the endpoint inserts a row at status `requested` and returns it. Approval
happens in the admin panel, which is read-only today and stays that way.

The response and the documentation must both say plainly that filing a request
is not a refund and that nothing is returned to the customer until an admin
approves it. An integrator who reads "refund created" and tells their customer
the money is coming has been misled by us.

Needs: a `refund_no` from the same gapless numbering used elsewhere — see
`allocateDocumentNo` and the numbering tests in `packages/db`.

**Verify:** file a request against a succeeded transaction (201, status
`requested`); against another application's transaction (404); against a
transaction that never succeeded (422 with a clear reason); twice with the
same `Idempotency-Key` (one row, same response).

---

## ☐ 4. Move the re-authentication gate to where it does something

Today's map, confirmed by reading
`apps/web/app/(admin)/admin/applications/actions.ts`:

| Action | What it does | Re-auth today |
| --- | --- | --- |
| Register a live credential | mints a live key | password + TOTP |
| Reveal webhook secret — **even Sandbox** | shows a signing key | password + TOTP |
| Rotate webhook secret — **even Sandbox** | breaks deliveries until redeploy | password + TOTP |
| **Rotate client secret** | **kills a live integration in 24h** | **nothing** |
| **Revoke application** | **kills a live integration instantly, permanently** | **nothing** |
| **Change scopes / webhook URL** | can narrow or redirect silently | **nothing** |

The two most destructive acts are ungated, and the CLI is stricter than the UI:
`scripts/app-secret.mts` refuses to rotate a live application without an
explicit `--yes-live`, precisely so a mistyped id cannot take down production.
The admin panel does it in one click.

**The rule to implement: the gate follows the mode, not the verb.**

- **Sandbox credential** — no re-authentication for anything. Reveal, rotate,
  revoke, edit. The admin signed in and passed TOTP to get here; asking again
  to reveal a test key is theatre, and theatre teaches people to type their
  code without reading the screen.
- **Production credential** — password + TOTP for: minting, revealing the
  signing secret, rotating either secret, revoking, and changing the domain
  list or the webhook URL. Everything that can move or break real money.

Reuse `confirmIdentity` in the same actions file. Add the guard to
`rotateSecretAction`, `revokeApplicationAction` and `updateApplicationAction`,
conditional on the credential's mode. Remove it from the two webhook-secret
actions when the mode is Sandbox.

Revocation also needs a typed confirmation in the UI — the application's name,
typed by hand — because it cannot be undone and a revoked application needs a
whole new registration.

**Verify:** for each of the six actions, once against a Sandbox credential
(proceeds with no prompt) and once against a Production credential (refused
without a correct password and code, and the refusal writes an audit row).

---

## ☐ 5. One application, two credential sets

**This is the schema change and the largest item. Do it in its own commit.**

### The problem with today's model

`is_live` is a column on `applications`, so a Sandbox credential and a
Production credential are two unrelated rows with two unrelated names. Nothing
links them, the list page cannot show that a Production credential is missing,
and the founder's request — mint Sandbox at registration, add Production later,
rotate either at any time, all from one page — cannot be expressed.

### The shape to build

Migration `0007_application_credentials`.

`applications` keeps what describes the integration:

    id, product_id, name, scopes, is_active, created_at

and **loses** `client_id`, `secret_hash`, `secret_last4`, `previous_secret_*`,
`webhook_secret`, `webhook_url`, `is_live`, `rotated_at`, `revoked_at`.

New table `application_credentials` holds what is per-mode:

    id
    application_id   → applications.id
    mode             'test' | 'live'
    client_id        unique
    secret_hash, secret_last4
    previous_secret_hash, previous_secret_last4, previous_secret_expires_at
    webhook_secret
    webhook_url
    rotated_at, revoked_at, created_at

with `UNIQUE (application_id, mode)` — an application has at most one Sandbox
and at most one Production credential.

`application_domains.application_id` becomes `credential_id`. **Domains are
per credential, not per application**, because a Sandbox integration points at
staging hosts and a Production one at real hosts, and letting a test credential
send a customer to the production site is exactly the confusion this table
exists to prevent. Keep the `hostname` CHECK constraints and the unique index
as they are — including the no-all-numeric-final-label rule that stops
`169.254.169.254`.

**Scopes stay on the application**, shared by both credentials. A scope
describes what the integration does; it should not silently differ between the
credential you tested with and the one you went live with.

### Migrating the rows that exist

Every existing `applications` row becomes one `applications` row plus one
`application_credentials` row carrying its current `is_live` as `mode`, its
existing `client_id`, hashes and webhook secret unchanged. Its domains move to
that credential. QuestionCall's issued sandbox secret must keep working — a
failed authentication after this migration is a failed migration.

Write the data migration in SQL in the same file. Do not do it from a script
that someone has to remember to run.

### The code that follows

- `authenticateApplication` looks up `application_credentials.client_id`, joins
  to `applications` for scopes and active state, and checks
  `credentials.revoked_at` as well as `applications.is_active`. Keep the
  fail-closed structure exactly as it is: constant work for a missing
  credential, revocation checked only after verification, one
  `UNAUTHENTICATED` for every cause.
- `AuthenticatedApplication.isLive` becomes `mode: 'test' | 'live'`. Update
  `generateSessionId` to take the mode.
- `registerApplication` mints an application plus one credential of a named
  mode. Add `addCredential(applicationId, mode)` for minting the second one
  later, and make it refuse when that mode already exists.
- `rotateSecret`, `rotateWebhookSecret`, `revealWebhookSecret` and
  `revokeApplication` all take a credential id, not an application id.
  Revoking one credential must not touch the other.
- `scripts/app-secret.mts` and `scripts/webhook-status.mts` follow.

**Verify:** QuestionCall's existing sandbox secret authenticates unchanged
after migrating. Then mint a Production credential on the same application,
confirm the two client ids differ in prefix and handle, confirm each has its
own signing secret and its own domain list, rotate one and confirm the other's
secret is untouched, revoke one and confirm the other still authenticates.

---

## ☐ 6. Sandbox and Production, everywhere a person reads

One word for each idea, no synonyms.

- **Sandbox** — never "test", never "sandbox credential" in one place and
  `test` badge in another.
- **Production** — never "live".

Places to change: the application list page, the detail page, the register
form's checkbox label and helper text, every action's success and error
message, `docs/API.md` §2 (which today does not mention the distinction at
all), `docs/INTEGRATION.md`, and the `/developers` page.

`test` and `live` survive **only** inside `client_id`, `cs_…` session ids, and
the `mode` column. If a string is rendered to a human, it says Sandbox or
Production.

---

## ☐ 7. Rebuild the application detail page

The current page puts four different kinds of thing in one flat column with
identical visual weight — read-only facts, routine settings, secret
disclosure, and irreversible destruction. "Rotate secret" and "Revoke" sit
side by side as two grey buttons with no confirmation.

Rebuild as two clearly separated credential panels — **Sandbox** and
**Production** — inside one page, each panel containing:

1. **Identity** — client id, `Secret ends …cC94`, created and last-rotated
   dates. Plus one plain sentence that does not exist anywhere today: *the
   client secret cannot be shown again; if it is lost, rotate it.*
2. **Delivery** — webhook URL and the signing secret (reveal / rotate).
3. **Domains** — this credential's list, with add and remove.
4. **Danger** — rotate the client secret, revoke this credential. Visually
   separated, destructive styling, typed confirmation for revoke.

When a mode has no credential, its panel shows one button: **Create Production
credential** (or Sandbox). That is how the founder mints the second set later,
and it is how the page communicates that a second set is expected — which
nothing communicates today.

Above both panels: the application's name, product, scopes and active state,
edited once and shared.

**The Sandbox panel must carry a short, honest note**: a Sandbox credential is
for use against a non-production deployment; used against production it takes
real money. Do not soften this into something that reads as reassurance.

Keep the existing components where they already work — `ScopeCheckboxes`,
`CredentialHandover`, the domain forms. This is a layout and hierarchy job,
not a rewrite of every input.

**Verify:** with a screenshot of an application in three states — Sandbox
only, both credentials, and Production revoked. The page is behind password
and TOTP, so whoever runs this plan must ask the founder to look, or drive it
with their own admin session. Do not claim a browser check that was not done.

---

## ☐ 8. Registration mints the Sandbox credential

The register form currently offers a "Live credential" checkbox, which is the
old one-row model showing through.

Replace it: registering an application always mints its **Sandbox** credential
and hands over both secrets on the existing handover screen. No checkbox, no
re-authentication — a Sandbox credential is not worth a TOTP prompt.

Production is minted afterwards, from the detail page, with password and TOTP.
That ordering is also the safer default: nobody creates a production credential
by accident while filling in a form for the first time.

Keep the four default scopes from `DEFAULT_APPLICATION_SCOPES`, and keep the
rule that an application with no scopes is refused.

---

## ☐ 9. `docs/INTEGRATION.md` — make the SDK optional

The guide is SDK-first and an integrator who does not want the dependency
currently has to reverse-engineer the client's source.

For every operation, show both: the SDK call as it is now, and the raw HTTPS
request beside it — method, path, headers including `Authorization: Bearer`
and `Idempotency-Key`, the JSON body, and the response.

Then add a section stating what you take on yourself by not using the SDK,
because these are the three things the client quietly does:

1. **Generate an `Idempotency-Key` for every mutating call.** Forgetting does
   not produce an error, it produces a second charge on a retry.
2. **Retry only transport failures.** Never retry a `VALIDATION_FAILED`.
3. **Verify the webhook signature over the raw body bytes**, before parsing
   and before reading a single field.

Also add, plainly:

- **What the SDK cannot do.** No credential provisioning, no rotation — both
  are admin-only, and `future_implementation.md` §4 says why.
- **What Sandbox means**, per the section at the top of this plan.
- **How to install it** — the existing §Installing the SDK is correct;
  `@softmato/sdk@0.1.0` is genuinely published to GitHub Packages (run
  `33669117257`), and the reader needs a PAT with `read:packages`.

---

## ☐ 10. Publish `sdk-v0.1.1`

Only after items 1, 2 and 3 are merged and the base URL is verified against a
real deployment from outside this repository.

    git tag sdk-v0.1.1 && git push origin sdk-v0.1.1

`.github/workflows/publish-sdk.yml` does the rest. Bump `version` in
`packages/sdk/package.json` in the same commit as the fixes, not in the tag.

**Verify:** read the workflow run with `gh run list --repo softmato/company`
and confirm `+ @softmato/sdk@0.1.1` in the log. `gh` is installed on this
machine as of 2026-09-03.

---

## ☐ 11. Signal the rotation overlap

`authenticateApplication` already computes `usedPreviousSecret` — it knows on
every request whether the caller is still presenting the superseded secret —
and **nothing reads it**. So during the 24-hour window nobody is told they have
not switched, and at hour 24 the integration simply starts failing.

Add a response header on any authenticated request that used the previous
secret, naming when it stops working:

    Softmato-Secret-Expires: 2026-09-04T10:00:00Z

Surface it in the SDK too — a warning through a callback or an optional
`onWarning` option, not a thrown error. And show it on the admin detail page
while the window is open, so the founder can see whether the integrator has
actually redeployed.

**Verify:** rotate a sandbox credential, call with the old secret (200 plus the
header), call with the new one (200, no header), and confirm the header is
gone once the window has passed — use a shortened overlap constant in a test
rather than waiting a day.

---

## Done when

- An integrator can install `@softmato/sdk`, call every method it exposes, and
  none of them 404.
- The same integration can be built from `docs/INTEGRATION.md` with `curl`
  alone, including the three things the SDK does for you.
- One application page shows a Sandbox and a Production credential, each with
  its own secrets, webhook URL and domain list, and either can be minted or
  rotated from that page.
- Nothing that can break a Production integration happens without a password
  and a TOTP code; nothing on a Sandbox credential asks for either.
- Every human-readable string says Sandbox or Production.
- QuestionCall's existing sandbox credential still authenticates.
- `pnpm typecheck && pnpm lint && pnpm turbo run test --force && pnpm legal:check`
  all pass. Use `--force`: a cached `pnpm test` can report FULL TURBO and prove
  nothing.

---

## Open, and needs the founder — not a guess

**What should a Sandbox credential actually do?**

Right now, nothing: it is a naming convention. Making it real means deciding
two things that belong to the founder, not to a session.

1. **Which gateway does a Sandbox payment reach?** Today `PAYMENT_MODE` is
   deployment-wide, so on production a Sandbox credential reaches the live
   gateways. Making it per-credential means the provider registry becomes a
   per-request choice instead of a boot-time one.
2. **Where does Sandbox money go in the accounts?** Test payments must not
   appear in the trial balance, so they need either a segregated set of
   accounts or a flag that every report filters on. This is a chart of
   accounts decision. `docs/CHART_OF_ACCOUNTS.md` has no answer today.

Until both are answered, the honest position is the one item 7 requires the UI
to state: a Sandbox credential is for a non-production deployment, and the
preview environment is what actually isolates the money.

**Also still open, carried over:** QuestionCall's remaining production
hostnames — apex, `www`, and any `app` or `api` subdomain, plus the host the
webhook endpoint sits on. Only `questioncall.com` is registered today, and the
webhook URL is empty, so no delivery can go anywhere yet.

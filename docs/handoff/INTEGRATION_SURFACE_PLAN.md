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
> plan's own "What was already decided" section — are prose _about_ the defect
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
> is arguably correct — the integrator _is_ the second person — but it is a
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

## ☑ 4. Move the re-authentication gate to where it does something

> **Done 2026-09-03.** The map is now the one this item asks for. The gate is
> `confirmIfProduction` in `applications/actions.ts`, and it reads the mode
> from the row via a new `credentialGate` query in `lib/applications/queries.ts`
> — **never from the form**. Every action here is reachable by anyone who can
> post to it, so a hidden `isLive` field would let a caller declare their own
> credential a sandbox one and skip the check.
>
> | Action                      | Sandbox    | Production                   |
> | --------------------------- | ---------- | ---------------------------- |
> | Rotate client secret        | no prompt  | password + TOTP              |
> | Revoke                      | typed name | typed name + password + TOTP |
> | Change scopes / webhook URL | no prompt  | password + TOTP              |
> | Reveal webhook secret       | no prompt  | password + TOTP              |
> | Rotate webhook secret       | no prompt  | password + TOTP              |
> | Register a live credential  | —          | password + TOTP (unchanged)  |
>
> **The typed confirmation applies to both modes.** It replaces the `confirm()`
> dialog, which asked a yes/no question about an application it could not name,
> on a screen that can show several. It is not a second factor and does not
> stand in for one: it guards the right person revoking the wrong row, which is
> a different failure from the wrong person revoking anything. "Sandbox is not
> gated" is about re-authentication, and this is not that.
>
> **Two gaps found while writing the test, both fixed.**
>
> 1. **A refusal with empty fields wrote no audit row.** `confirmIdentity`
>    returned early when the password or code was blank, and only audited the
>    _wrong password_ path. That is backwards — an empty submission against a
>    Production credential is the shape a script makes; a wrong password is the
>    shape a person makes, and the one worth seeing in the log was the one not
>    being written. Both are now recorded under
>    `application.reauth_failed`, told apart by `reason`
>    (`reauth_missing` / `reauth_failed`).
> 2. **The audit row did not say which application.** `resourceId` was never
>    set. It is now, everywhere except registration, which has no row yet.
>
> **Verified by `apps/web/tests/application-gate.test.ts`** — 14 cases against
> real Postgres, every action twice. The assertions are on the **database**,
> not on the returned message: each Production refusal reads the row back and
> checks the secret, the signing secret or the scope list did not move. A
> refusal that returns `ok: false` after already rotating is precisely the bug
> the file exists to catch.
>
> Three modules are mocked and only three — `requireAdmin` (the session),
> `reauthenticate` (so a correct code can be simulated without a real admin's
> TOTP secret), and `revalidatePath`. **The mode is not mocked**, because that
> is the thing under test.
>
> **What was not verified: the screen itself.** `/admin/applications` answers
> `307` to `/login` for a signed-out request, so the founder's password and
> TOTP are needed to look at it. (An earlier revision of this note said `404`;
> that was a reading taken while the dev server was still compiling its
> middleware, and it was wrong.) The
> server actions are covered above; what is unverified is which fields are
> _drawn_, which is a rendering decision the server re-makes anyway. Item 7
> rebuilds this page and its verify step already requires a real admin session.
>
> **`scripts/app-secret.mts` is deliberately unchanged.** It is break-glass and
> already stricter than the UI was — `--yes-live` for a live rotation. It is
> now no stricter than the panel, which was the point.
>
> `pnpm typecheck`, `pnpm lint` and `pnpm turbo run test --force` all pass —
> 564 tests.

Today's map, confirmed by reading
`apps/web/app/(admin)/admin/applications/actions.ts`:

| Action                                   | What it does                                        | Re-auth today   |
| ---------------------------------------- | --------------------------------------------------- | --------------- |
| Register a live credential               | mints a live key                                    | password + TOTP |
| Reveal webhook secret — **even Sandbox** | shows a signing key                                 | password + TOTP |
| Rotate webhook secret — **even Sandbox** | breaks deliveries until redeploy                    | password + TOTP |
| **Rotate client secret**                 | **kills a live integration in 24h**                 | **nothing**     |
| **Revoke application**                   | **kills a live integration instantly, permanently** | **nothing**     |
| **Change scopes / webhook URL**          | can narrow or redirect silently                     | **nothing**     |

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

## ☑ 5. One application, two credential sets

> **Done 2026-09-04, applied to `softmato-dev` only.** Production is
> untouched and needs the founder — see "Before this reaches production" at the
> end of this note.
>
> The shape is the one specified: `applications` keeps `id, product_id, name,
scopes, is_active, created_at` and nothing else; `application_credentials`
> holds everything per-mode with `UNIQUE (application_id, mode)`;
> `application_domains.application_id` became `credential_id`. Scopes stayed on
> the application.
>
> **Two migrations, not one, and the second was not in the plan.**
>
> `0007_application_credentials` is the split, with the data migration in the
> same file as required. `0008_credential_on_payments` adds `credential_id` to
> `payment_sessions`, `transactions` and `webhook_deliveries`, and it exists
> because 0007 breaks webhook delivery on its own: `webhook_url` and
> `webhook_secret` moved onto the credential, and an application can now hold
> two with different endpoints and different signing keys. Nothing recorded
> which one made a payment. Deriving it from the `cs_test_` prefix would be a
> guess dressed as a lookup and does not work at all for a transaction with no
> session, so the credential is recorded where the payment is. On
> `webhook_deliveries` it is kept on the row rather than resolved at send time:
> a rotation between enqueue and delivery must not change which key a queued
> row was signed with.
>
> **0007 had to be hand-written, and the reason is a defect worth knowing
> about.** `drizzle-kit generate` diffs against the newest snapshot in `meta/`,
> and there is **no `0006_snapshot.json`** — migration 0006 was hand-written
> and never recorded one. So the generator's baseline was 0005, which predates
> `application_domains` entirely, and it emitted `CREATE TABLE
"application_domains"` for a table that already exists. That statement fails
> on every database that has run 0006. The generated _snapshot_ is correct
> because it is built from the schema files rather than from the diff, so it
> was kept and the drift heals from here — the next `generate` has a truthful
> baseline. `drizzle-kit check` reports "Everything's fine" either way: it
> validates the journal, not the SQL.
>
> **A silent pre-existing bug turned up in `lib/applications/queries.ts`, and
> the gate test is what caught it.** Drizzle renders `${table.column}` inside a
> `sql` template **unqualified**, so a correlated subquery written as
>
>     WHERE ${applicationDomains.applicationId} = ${applications.id}
>
> comes out as `WHERE "application_id" = "id"` — and inside the subquery both
> names resolve against `application_domains`, comparing a row's own two
> columns to each other. It compiles, it runs, and it answers the wrong
> question. That has been live on the applications list since the allowlist
> shipped, computing the domain count from
> `application_domains.application_id = application_domains.id`. Nobody saw it
> because the only application had no domains, so zero was right by accident.
> The counts are now a `GROUP BY` and the `EXISTS` gates use literal qualified
> table names.
>
> ### The code that followed
>
> - `authenticateApplication` looks up `application_credentials.client_id`,
>   joins to `applications`, and checks **both** `credentials.revoked_at` and
>   `applications.is_active` — neither implies the other. The fail-closed
>   structure is unchanged: constant work for a missing credential, revocation
>   checked only after verification, one `UNAUTHENTICATED` for every cause.
> - `AuthenticatedApplication` gained `credentialId` and `mode` and lost
>   `isLive`. `generateSessionId` and `generateClientId` take the mode.
> - `addCredential(applicationId, mode)` mints the second set and refuses when
>   that mode already exists — the `UNIQUE` would refuse it anyway; this turns
>   a constraint violation into a sentence. **Domains start empty on purpose**:
>   copying the Sandbox list onto Production would seed the exact confusion the
>   per-credential allowlist exists to prevent.
> - `rotateSecret`, `revokeCredential` (renamed from `revokeApplication`),
>   `revealWebhookSecret`, `rotateWebhookSecret` and the new
>   `setCredentialWebhookUrl` all take a credential id. `updateApplication` is
>   down to name and scopes.
> - `assertRegisteredHost` / `isRegisteredHost` / `addDomain` / `listDomains`
>   take a credential id.
> - `scripts/app-secret.mts` and `scripts/webhook-status.mts` follow. The CLI's
>   `--yes-live` guard now reads `mode`, and `webhook:status` lists per
>   credential rather than per application — one line per application would be
>   an average of two different answers.
> - A new `client_id_matches_mode` CHECK: `app_live_…` cannot sit on a row
>   labelled `test`. Two places holding the same fact is two places to
>   disagree, and that disagreement would be invisible.
>
> ### The screens
>
> `application-panel.tsx` and `webhook-secret-panel.tsx` are gone, replaced by
> `credential-panel.tsx` (identity / delivery / domains / danger, drawn once
> per mode, with a **Create Production credential** button where a mode has no
> credential) and `application-header.tsx` for the shared name, scopes and
> state. The Sandbox panel carries the honest note this plan requires. That is
> most of item 7's structure; item 7 still owns the hierarchy pass, and item 6
> still owns the vocabulary — the `test` / `live` badges are not all gone yet.
>
> **Editing scopes is gated by the application, not by a mode**, because both
> credentials share them: narrowing a scope on an application that has a
> Production credential breaks a live integration even though the form never
> mentions modes.
>
> ### Verified
>
> Against `softmato-dev`, end to end, exactly the list this item asks for:
>
>     register → one Sandbox credential, and its secret authenticates
>     mint Production on the same application → prefixes and handles differ
>     a second Production credential → refused
>     signing secrets → differ
>     domain lists → separate (sandbox.example.com vs live.example.com)
>     rotate Sandbox → Production still authenticates
>     revoke Sandbox → Production still authenticates
>
> **The migrated row survived.** `HostelHub sandbox`
> (`app_test_hostelhub_2d90d3bq`) moved with its `client_id`, `secret_hash`,
> `secret_last4`, `webhook_url` and original `created_at` unchanged. It was
> then rotated **through the CLI** and the new secret authenticated over real
> HTTP against `GET /v1/transactions/…` — `401` for a wrong secret on the same
> route, so the refusal is real. That proves the migrated row is found by
> client id in the new table and its hash verifies.
>
> What it does _not_ prove is that an **already-issued** secret still works,
> because the plaintext was shown once and is not stored — there is nothing to
> test with. The migration copies `secret_hash` verbatim and never rehashes,
> which is the mechanism the guarantee rests on.
>
> `pnpm typecheck`, `pnpm lint` and `pnpm turbo run test --force` all pass —
> 667 tests. `drizzle-kit check` reports no drift.
>
> ### Before this reaches production
>
> QuestionCall's `app_test_questioncall_f3kv9zgz` lives on the production
> branch and its secret is in QuestionCall's hands, not ours. So:
>
> 1. Run this **pre-flight read** on production first. Every row must pass the
>    new CHECK, or 0007 aborts on the insert:
>
>        SELECT client_id, is_live,
>               client_id LIKE 'app_' || (CASE WHEN is_live THEN 'live' ELSE 'test' END) || '\_%' AS ok
>        FROM applications;
>
> 2. Apply `0007` and `0008` together. They are one logical change.
> 3. Have QuestionCall make any authenticated call. A `401` means roll back —
>    a failed authentication after this migration is a failed migration.

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

## ☑ 6. Sandbox and Production, everywhere a person reads

> **Done 2026-09-08.** Nine strings and one lookup.
>
> **A defect, not just wording.** `addCredential` interpolated the raw column
> into its refusal — `This application already has a ${mode} credential` — and
> `failure()` in `applications/result.ts` hands the panel
> `error.publicDetail ?? error.message` unchanged. So the one sentence in this
> flow that a person only ever sees when something has gone wrong was also the
> one still saying "test". Fixed at the throw.
>
> **`CREDENTIAL_MODE_LABEL` now decides the word.** It lives in
> `packages/db/schema/applications.ts`, beside the enum whose rule it enforces.
> Four call sites had each written their own
> `mode === 'live' ? 'Production' : 'Sandbox'`, and
> a rule re-implemented four times is a rule that drifts on the fifth. The two
> screens and the `payment-core` message go through the lookup now. The two
> CLI scripts do not: `app-secret.mts` prints `PRODUCTION` in capitals on
> purpose, which is the same word doing emphasis, and importing a label map to
> lower-case it would be a worse trade than leaving two correct strings alone.
>
> **"Go live" was treated as a synonym and removed too.** `docs/INTEGRATION.md`
> §7 "Going live" is now "Going to production", and `/developers`' related-links
> panel reads "Before you go to production". This is a judgement call and worth
> disagreeing with: "go live" is ordinary English for launching, not a name for
> the credential. It went because both places are literally about being issued
> a Production credential, and a reader who meets "go live" and "live
> credential" on the same page has been handed the synonym this item exists to
> delete.
>
> **`docs/API.md` §2 gained the section it never had**, and the section it did
> have was stale: "Every application also has a registered domain list" has
> been wrong since item 5 moved `application_domains` onto `credential_id`.
> Both are fixed together, because a vocabulary paragraph sitting above a false
> ownership claim is not an improvement. The new text states the honest
> position from the top of this plan — Sandbox is a label on the identifier,
> `PAYMENT_MODE` is what decides whether money is real — rather than implying
> an isolation that does not exist.
>
> **The register form's checkbox was fixed, not skipped.** It now reads
> "Production credential / leave off to mint a Sandbox credential". Item 8
> deletes the whole control four commits from now, so this is two words with a
> short life; they were changed anyway so that this item is true on its own and
> the tree is never in a state where the plan says the vocabulary is done and a
> screen disagrees.
>
> **Deliberately left alone.** `--yes-live` (a flag name, in the identifier
> class with `app_live_` and the `mode` column); `isLive` locals and props;
> code comments that discuss the wire values; and the dashboard's "Live" tab
> and the CMS's "goes live on the public site", which are about publishing
> content and have nothing to do with a credential.
>
> **What ran.** `pnpm typecheck`, `pnpm lint`, `pnpm turbo run test --force`
> — 667 tests, unchanged, across five packages — and `pnpm legal:check`, 8
> documents, 0 blocking. Formatting was checked on the **staged bytes**
> (`git show :<path> | prettier --check --stdin-filepath <path>`) because
> `core.autocrlf=true` makes a plain `prettier --check` call every file dirty;
> it caught one real reflow in `application-header.tsx`, which was fixed and
> re-checked.
>
> **Not verified: the screens.** `/admin/applications` is behind a password and
> a TOTP code, so what was confirmed is which strings the components contain,
> not how they render. Item 7's verify covers that and requires the founder's
> own session.

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

## ☑ 7. Rebuild the application detail page

> **Done 2026-09-08, over three passes, the first two of which failed.** The
> founder drove the page in their own admin session and sent screenshots; this
> item was not marked on code review.
>
> ### What it is now
>
> Each panel is **Keys, Delivery, Domains, Danger**, headed "Sandbox
> credentials" / "Production credentials".
>
> **Keys** is a table and answers "what have I got" with no form on screen:
> the count stated (`two secrets · one public id`), then client id, client
> secret and signing secret. **Delivery** is the webhook URL. **Domains** is
> unchanged. **Danger** holds reveal, rotate-signing, rotate-client and revoke,
> each closed behind its own button.
>
> What each key is _for_ lives in `key-legend.tsx`, a sticky rail at the right
> of the page in the `TocRail` shape the legal and `/developers` pages already
> use — said once, in the margin, instead of once per row and therefore twice
> per page.
>
> ### The first pass failed, and the founder's word for it was "confusing"
>
> It was the accurate word. Adding headings to a flat column does not fix a
> flat column. With both credentials present the page rendered about ten forms
> and — because every Production action carries its own password and
> authenticator fields — **six "Your password / Authenticator code" pairs
> visible at once**, which reads as six different passwords rather than one
> asked six times. Collapsing the actions is what fixed it; nothing else came
> close.
>
> **`Collapsible` never closes itself.** A rotation's one-time secret and a
> reveal's key are rendered by the form inside, so auto-closing on success
> would throw away the only copy an admin will ever see. Cancel is the only
> thing that unmounts one, which doubles as the way to clear a revealed secret
> off the screen.
>
> ### Two defects the screenshots caught that no gate would have
>
> **The browser was writing the admin's email into the form.** Both screenshots
> had `sidd@softmato.com` sitting in the Production webhook URL field and in
> the type-the-name-to-revoke field. Chrome ignores `autocomplete="off"` on a
> password input, decides any form containing one is a sign-in form, and fills
> the account email into the nearest text input above it. `ReauthFields` now
> uses `autocomplete="new-password"`, which is the documented way to say "not
> the credential you have saved". **Unverified in a browser** — it needs a
> real password manager, so confirm it on the next look.
>
> **A `500` shipped in the previous commit and every gate was green.**
> `credential-panel.tsx` is a client component, and importing
> `CREDENTIAL_MODE_LABEL` by value from `@softmato/db` pulled `pg` — and so
> `dns`, `net`, `tls`, `fs` — into the browser bundle. `tsc` was happy, ESLint
> was happy, 667 tests were happy: the failure exists only inside the bundler,
> and the only way to see it is to load the page, which needs a password and a
> TOTP code. `apps/web/tests/client-boundary.test.ts` now fails on any
> `'use client'` file that imports a db value; it was checked by reintroducing
> the exact broken import and watching it name the file. **`pnpm build` is part
> of the gates for UI work from here** — it is what exercises every route's
> client graph.
>
> ### The Sandbox signing secret is printed, and that is a trade
>
> Asked for directly. A Sandbox credential is not gated, so the Reveal click
> asked nothing and refused nothing. What it also did was keep the key out of
> screenshots — which the founder's own screenshot then demonstrated by putting
> the `softmato-dev` Sandbox signing secret into a chat log. Production is
> untouched: still behind Reveal, still re-authenticated, still audited.
>
> The read is a second named query, `sandboxSigningSecret`, rather than a
> widened `credentialColumns` — that object exists so a `select()` cannot start
> leaking a secret the day a column is added — and the `mode = 'test'` check is
> in the `WHERE` clause rather than in the caller, because a guard the caller
> must remember is one that is eventually forgotten. **It is not audited**: a
> page render is not an event, and auditing it would put a row in the log every
> time the screen opens and bury the Production reads that matter.
>
> ### The client secret cannot be shown, and was asked for
>
> "We should also reveal the client secret as this is just sandbox." It cannot
> be done in either mode. `secret_hash` is argon2id and argon2 salts every
> hash, so there is no query, no key and no admin route that produces the
> plaintext — Sandbox is not a special case, it is the same column. The panel
> says so in a sentence and points at rotation, which for Sandbox asks for
> nothing. Making it readable would mean storing it reversibly, which is a
> change to how the payment API authenticates and belongs to the founder, not
> to a session.
>
> ### Verified
>
> Two of the three states the plan asks for, seen in the founder's own admin
> session on `softmato-dev`:
>
>     both credentials       ✔ screenshot
>     Production revoked     ✔ screenshot
>     Sandbox only           ✘ not captured
>
> The third **cannot be produced on that application any more**, and that is
> what turned up the bug below: application 1 now carries a revoked Production
> credential, and before migration 0009 a revoked credential held its mode's
> slot for good.
>
> **Revoking Production was a dead end**, which the founder found by asking how
> to undo it. `UNIQUE (application_id, mode)` counted revoked rows, so the
> panel had no button and `addCredential` refused; the only routes back were a
> new application or an `UPDATE` by hand. Migration `0009` makes the index
> partial, the panel offers a replacement, and the dead credentials are listed
> underneath as a footnote so an old client id in a log still resolves to
> something on screen. `packages/db/tests/credential-slot.test.ts` covers it.
>
> `pnpm typecheck`, `pnpm lint`, `pnpm turbo run test --force`, `pnpm build`
> and `pnpm legal:check` all pass. Formatting checked on the staged bytes.
>
> **Still worth a look when the founder is next signed in:** the rail at `lg`
> and above, the autofill fix, and a fresh application showing the Sandbox-only
> state.

The current page puts four different kinds of thing in one flat column with
identical visual weight — read-only facts, routine settings, secret
disclosure, and irreversible destruction. "Rotate secret" and "Revoke" sit
side by side as two grey buttons with no confirmation.

Rebuild as two clearly separated credential panels — **Sandbox** and
**Production** — inside one page, each panel containing:

1. **Identity** — client id, `Secret ends …cC94`, created and last-rotated
   dates. Plus one plain sentence that does not exist anywhere today: _the
   client secret cannot be shown again; if it is lost, rotate it._
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

## ☑ 8. Registration mints the Sandbox credential

> **Done 2026-09-08.** The checkbox is gone, and so is the re-authentication
> block it used to reveal.
>
> **The mode is no longer read from the request at all.** It would have been
> enough to delete the control and default `mode` to `test`, and that would
> have been wrong: `registerApplicationAction` is reachable by anyone who can
> post to it, so a default is something a caller overrides. A hand-rolled
> `isLive=true` against the old code would have minted a Production credential
> through the one path in this file that asks for no password and no code. It
> is now the literal `'test'`, and there is no field to send.
>
> **Two cases in `apps/web/tests/application-gate.test.ts`**, which already
> holds the mocks this needs. The first posts `isLive=true` by hand and asserts
> on the **row** — one credential, `mode` `test`, client id prefixed
> `app_test_` — rather than on the returned message, because a response saying
> "Registered" over a `live` row is exactly the bug. The second asserts
> `reauthenticate` is never called, which is the other half of the item: a
> Sandbox credential is not worth a TOTP prompt. Against the old code the first
> case fails twice over — it would mint `live`, and the empty form would be
> refused by the gate.
>
> Scopes and the domain rule are untouched: `DEFAULT_APPLICATION_SCOPES` still
> seeds the form, an application with no scopes is still refused, and so is one
> with no domains.
>
> `pnpm typecheck`, `pnpm lint`, `pnpm turbo run test --force` and `pnpm build`
> all pass — 19 cases in the gate file, 676 across the repo.

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

## ☑ 9. `docs/INTEGRATION.md` — make the SDK optional

> **Done 2026-09-08.** Every call in §2 is shown twice, and the three things
> the client does quietly are now a numbered section rather than a sentence.
>
> **§2.1, 2.2, 2.3 and 2.4 each carry a `curl` beside the SDK form** —
> method, path, `Authorization: Bearer`, `Idempotency-Key` on the mutating
> ones, the JSON body and the response. The transaction example keeps the
> unescaped slash in `TXN-2083/84-00000008`, because that is what the
> catch-all route actually accepts and an escaped one would not work.
>
> **The webhook section gained a from-scratch verification**, which is the part
> an integrator genuinely cannot reverse-engineer from the docs: the signed
> message is `${timestamp}.${raw body}`, HMAC-SHA256 under the signing secret,
> hex, compared in constant time, with the five-minute age check. That was read
> off `packages/sdk/webhooks.ts` — `signingBase`, `sign` and `MAX_AGE_SECONDS`
> — and not written from memory. A wrong recipe here is worse than none: it
> fails on genuine deliveries while a forged one nobody checked sails through.
>
> **New §6.7, "What you take on by not using the SDK"**, states the three in
> the order they bite. The idempotency one says the part that is easy to miss:
> the key must be generated **before the first attempt and stored with the
> work**, because a key generated per attempt is not a key at all — and the
> cost of getting it wrong is a second charge, not an error.
>
> **Two more sections the item asks for.** "What the SDK cannot do for you" —
> no credential provisioning, no rotation, both admin-only, because a
> credential that can mint another credential never has to be stolen twice.
> And "What Sandbox means", carrying the honest position from the top of this
> plan: a label on the identifier, not an isolation boundary, and used against
> the production deployment it takes real money.
>
> Installing was already correct and is left alone, with the version bumped by
> item 10.
>
> `pnpm typecheck`, `pnpm lint`, `pnpm turbo run test --force` and `pnpm build`
> pass; formatting checked on the staged bytes.

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

## ☑ 10. Publish `sdk-v0.1.1`

> **Done 2026-09-04.** `+ @softmato/sdk@0.1.1` — run `33879148280`, success,
> 28s, 26 files, tag `sdk-v0.1.1` on `5ba2553`. The workflow's own
> tag-versus-manifest check printed `Publishing @softmato/sdk@0.1.1` before
> publishing, so the tag and the tarball cannot disagree.
>
> The precondition held: items 1-3 were merged to `main` (`de1c5ad`) and
> deployed before the tag was pushed, and the base URL was verified against the
> live host from outside the repository. So unlike `0.1.0`, every method this
> version exposes resolves against its own default base URL.
>
> The version bump is its own commit (`5ba2553`), not part of the tag, as this
> item requires.
>
> **One thing was not verified and should be, by whoever has the PAT.** The
> published tarball was confirmed from the workflow log, not by installing it:
> reading from GitHub Packages needs a token with `read:packages`, which a
> session does not have. The equivalent check on the _local_ pack was done in
> item 1 and passed — clean directory outside the repo, no `baseUrl`, a `401`
> with a server-issued request id. Repeating it against the published `0.1.1`
> is one command with a PAT in `.npmrc`, and it is the check QuestionCall will
> effectively be running on their first install anyway.

Only after items 1, 2 and 3 are merged and the base URL is verified against a
real deployment from outside this repository.

    git tag sdk-v0.1.1 && git push origin sdk-v0.1.1

`.github/workflows/publish-sdk.yml` does the rest. Bump `version` in
`packages/sdk/package.json` in the same commit as the fixes, not in the tag.

**Verify:** read the workflow run with `gh run list --repo softmato/company`
and confirm `+ @softmato/sdk@0.1.1` in the log. `gh` is installed on this
machine as of 2026-09-03.

---

## ☑ 11. Signal the rotation overlap

> **Done 2026-09-08.** The header, the callback, and the admin surface — plus
> the column the admin surface needed, which was not in the plan.
>
> **`Softmato-Secret-Expires`** is set by `secretExpiryHeaders` in
> `lib/api/respond.ts` and applied by both wrappers in `lib/api/route.ts`. A
> boolean cannot say _when_, and "when" is the entire content of the warning,
> so `AuthenticatedApplication` gained `previousSecretExpiresAt` alongside the
> `usedPreviousSecret` that nothing had ever read.
>
> Two details that are decisions rather than details. It is set on a handler's
> **own `Response`** too — the PDF endpoints — because the warning is about the
> credential and not the content type, and an integrator whose only call is a
> receipt download would otherwise never be told. And it is set **before** the
> status check, so a `422` during the overlap still carries it: that request
> authenticated with the old secret whether or not its body validated.
>
> There is no header for the healthy case. One that is always present is one
> nobody reads.
>
> **The SDK takes `onWarning`, never a throw.** The call succeeded — that is
> what the overlap is _for_ — so failing it would break a working integration
> in order to warn it that it is about to break. An unparseable date is dropped
> rather than guessed at, because the integrator plans a deploy around the date
> and a wrong one is worse than none. A callback that throws is swallowed: a
> failing logger must not take a payment down with it. `SoftmatoWarning` is
> exported.
>
> **The admin surface needed a column, and this is the part not in the plan.**
> The item asks to show the overlap "so the founder can see whether the
> integrator has actually redeployed" — and "the old secret still works until
> Tuesday" cannot answer that. It is a fact about our schedule. Whether anyone
> is _still calling_ with the old secret is the fact that says whether Tuesday
> is a quiet day or a support call. So migration `0010` adds
> `previous_secret_last_used_at`, written by `authenticateApplication` when the
> superseded secret is the one that matched.
>
> That write is **deliberately not awaited and cannot fail the request**.
> Authentication is the hot path on every `/v1` call and this is bookkeeping
> for a human reading a screen later; a database hiccup must not turn a good
> request into a `500`. It only runs during the overlap, so it is a handful of
> writes over 24 hours rather than one per request.
>
> The panel reports silence as silence: "no call has used it since the
> rotation" may mean they redeployed immediately or that nothing has called at
> all, and those are indistinguishable from here. Saying "they have switched"
> would be inventing the difference.
>
> **Verified as the item asks — a shortened overlap, not a day's wait.**
> `packages/db/tests/secret-overlap.test.ts`, five cases against real Postgres,
> writes `previous_secret_expires_at` directly: the same column `rotateSecret`
> writes and `matchSecret` reads. Nothing is mocked, because the boundary under
> test is "does an expired overlap stop authenticating" and a fake clock would
> move that boundary somewhere the production code never goes.
>
>     old secret, window open      authenticates, expiry returned
>     its use is recorded          previous_secret_last_used_at set
>     new secret, window open      authenticates, no expiry
>     old secret, window passed    refused
>     new secret, window passed    authenticates
>
> Five more in `packages/sdk/tests/client.test.ts` cover the callback: fired
> once with the parsed date, silent with no header, silent on an unparseable
> one, fired on a `422` before the throw, and harmless when it throws.
>
> **A trap for whoever writes the next test here.** A fixture client id must
> satisfy `clientIdFromSecret`'s `(live|test)_[a-z0-9-]+_[a-z0-9]+` — the last
> segment takes **no hyphen**. A `Date.now()` marker joined with a dash is
> rejected before a single query runs, and the suite then fails for a reason
> that has nothing to do with what it is testing.
>
> `docs/API.md` §2 and `docs/INTEGRATION.md` §6.6 both document the header, and
> §6.6 carries the `onWarning` snippet.
>
> `0010` is applied to **`softmato-dev` only**, like `0007`, `0008` and `0009`.
> Production still runs the old schema.

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

# Taking the credential split to production

> **EXECUTED 2026-09-08.** Migrations `0007`–`0010` are applied to production
> and verified: all three secret hashes copied byte-for-byte, no rows lost, no
> backfill misses, API recovered. `sdk-v0.1.2` is tagged and published. What
> follows is kept as the record of what was done, with §0 added afterwards.
> Nothing below needs running again.

---

## 0. What this cost, and how to not pay it twice

The plan said "deploy, then migrate, and accept a window of seconds". The window
was **five days**, because the two steps have different triggers: merging a PR
deploys by itself, and migrating does not. Nobody forgot — the runbook simply
assumed the person merging would immediately run step 3, and merging is a thing
you can do from a phone.

For the whole of that window, every authenticated `/api/v1` call returned `500`.
It was survivable only by luck of timing: no integrator called during it, and
`PAYMENT_MODE=sandbox` meant no real money could move. Neither will be true
next time.

**The fix is not "remember harder".** Either:

- **Make the migration part of the deploy** — a release step that runs before
  traffic is cut over, so the two can't drift apart; or
- **Write migrations that don't need the two to be simultaneous** — add the new
  table, have the code read new-with-fallback-to-old, backfill, and only drop
  the old columns in a _later_ release. Three boring deploys, zero windows.

The second is the standard answer (expand/migrate/contract) and is what any
future column move should use. This one was done the fast way because the blast
radius was three sandbox applications and no money; that will not be true of the
next one.

---

A runbook for `feat/application-credentials` —
[PR #3](https://github.com/softmato/company/pull/3), which closes
`INTEGRATION_SURFACE_PLAN.md`.

Everything in that plan is done and green on `softmato-dev`. This file is the
part that is not done: getting it onto production without taking the site down.

---

## Why this is not "merge and go"

**Migration `0007` is breaking in both directions.** It drops eleven columns
from `applications` — `client_id`, `secret_hash`, `secret_last4`, `webhook_url`,
`webhook_secret`, the three `previous_secret_*`, `is_live`, `rotated_at`,
`revoked_at` — and moves them onto a new `application_credentials` table.

So:

- The **currently deployed** code selects `applications.client_id`. It cannot
  run once `0007` has been applied.
- The **new** code selects from `application_credentials`. It cannot run until
  `0007` has been applied.

There is no ordering that avoids a window; there is only a short one and a long
one. Migrating first and then deploying leaves the old code broken for the whole
build (~2–3 minutes). Deploying first and then migrating leaves the new code
broken for as long as the migration takes (~seconds).

**Take the second.** Have the deployment built and ready, apply the migrations,
then promote.

The window is cheap right now and will not stay cheap: production has three
applications (two `hostelhub`, one `questioncall`, all Sandbox), every
`webhook_url` is empty so no delivery can go anywhere, and
`PAYMENT_MODE=sandbox` means no real money is in flight. Do it before any of
those three change.

---

## Before anything

**Take a Neon backup branch of production.** `0007` is the only step here that
cannot be undone by another migration, and a copy-on-write branch is instant and
free. Everything after it is recoverable; this one is recoverable only from a
restore point that has to exist beforehand.

Production is `ep-flat-wildflower-azfujbu5`. Dev is `ep-spring-brook-azbbif7k`
and is **not** the one being changed here.

---

## 1. The pre-flight read

`0007` adds a `CHECK` that a client id's prefix agrees with its mode:

```sql
client_id LIKE 'app_' || mode || '\_%'
```

The data migration inserts every existing application as a credential, so a
single row whose prefix disagrees with `is_live` **aborts the migration
part-way**. Run this against production first. Every row must answer `t`:

```sql
SELECT client_id, is_live,
       client_id LIKE 'app_' || (CASE WHEN is_live THEN 'live' ELSE 'test' END) || '\_%' AS ok
FROM applications;
```

A row answering `f` has to be understood before going further — it means an
application's prefix and its flag have disagreed since it was created, and
deciding which of the two is true is a judgement about who holds that secret.

> This session could not run the read: production database access is blocked
> from the agent environment, which is the correct guardrail and was not worked
> around. It is one query in the Neon console.

---

## 2. Merge and build

```bash
gh pr merge 3 --squash
```

Wait for Vercel to finish building `main`. **Do not promote it yet** if you have
a promotion step; if the project auto-promotes, accept the short window and go
straight to step 3 the moment the build starts.

---

## 3. Apply the migrations

All four go together. `0007` and `0008` are one logical change — `0007` moves
`webhook_url` and `webhook_secret` onto the credential, and without `0008`
nothing records which credential made a payment, so webhook delivery breaks.

```bash
pnpm --filter @softmato/db exec tsx --env-file=D:/company/.env.prod ./migrate.ts
```

**The env path must be absolute.** `node` resolves `--env-file` against the
shell's directory while `pnpm --filter` runs the script from `packages/db`, so a
relative `../../.env.prod` climbs one level too far and dies with
`.env.prod: not found`. The `drizzle-kit migrate` form this file used to give
never loads an env file at all and fails with `url: undefined`; and the
package's own `migrate` script hardcodes `.env.local`, which is **dev**. What each one does:

|        |                                                                                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0007` | The split. New enum, new `application_credentials`, data migration, `application_domains.application_id` → `credential_id`, eleven columns dropped from `applications`.                         |
| `0008` | Nullable `credential_id` on `payment_sessions`, `transactions`, `webhook_deliveries`, backfilled, foreign keys added. Nullable on purpose so rows with a null `application_id` do not abort it. |
| `0009` | Swaps the `(application_id, mode)` unique constraint for a partial index, `WHERE revoked_at IS NULL`, so revoking a credential stops holding its mode's slot for good.                          |
| `0010` | One nullable column, `previous_secret_last_used_at`.                                                                                                                                            |

---

## 4. Verify, in this order

1. **QuestionCall's existing secret still authenticates.** This is the whole
   guarantee. `0007` copies `secret_hash` verbatim and never rehashes, so it
   should — but a `401` here means the migration failed, whatever else looks
   fine. Ask them to make any authenticated call, or use a stored one.
2. `/admin/applications` renders, and the application shows a Sandbox
   credential with its original client id and `created_at`.
3. Its domain list is intact and now hangs off the credential.

If step 1 fails, restore the backup branch. Do not try to repair forward: a
failed authentication after this migration is a failed migration.

---

## 5. Afterwards, and not urgently

**QuestionCall's `app_test_questioncall_f3kv9zgz` lives in the production
database.** Per the decision recorded at the end of
`INTEGRATION_SURFACE_PLAN.md`, Sandbox credentials belong on a non-production
deployment. Mint them one there, give them that base URL, and revoke the
production one — which `0009` has just made survivable, so it is no longer a
one-way door.

There is no hurry while `PAYMENT_MODE=sandbox`. There is a hurry the moment that
changes.

### Why this matters more than "tidiness"

A Sandbox credential on production does not just look untidy — its rows are
**indistinguishable from real ones** in every report the company reads.

- `mode` isolates nothing. `sessions/id.ts` says it outright: it picks the
  `cs_test_` prefix and nothing else. What gates real money is `PAYMENT_MODE`,
  which is per-deployment.
- **No payment table carries a mode of its own** — not `payment_sessions`,
  `transactions`, `invoices`, or `journal_entries`. The only route to it is a
  join through `credential_id` to `application_credentials.mode`.
- **Nothing performs that join.** `lib/admin/dashboard-queries.ts` has no mode
  filter, and neither do the payments, invoices or reconciliation pages.
- `credential_id` is nullable, and 443 of production's 444 sessions have it
  null. For those rows the information does not exist to filter on, so this
  cannot be fixed by adding a `WHERE` clause later.

It has already begun: `cs_test_f32mV1rz...`, NPR 12,000, `status=created`,
opened 2026-08-15 by `app_test_hostelhub_2d90d3bq`, sits in the production
database and is counted among its 444 sessions.

### The decision: label it, do not exile it (2026-09-08)

Deployment isolation was considered and **rejected as too complex** for a
company whose integrators are all its own products. It needs a second database,
a reachable preview admin panel, and a host-routing fix, all to keep three
sandbox rows out of a table.

The chosen design instead makes Sandbox activity _visible and separable_ where
it lands:

1. **Write `mode` onto the payment row at creation.** It is already in hand —
   `AuthenticatedApplication.mode` comes out of authentication, and
   `generateSessionId` already takes it. This is the piece that makes the data
   filterable at all, and without it nothing else here is possible.
2. **The admin read model defaults to Production**, with Sandbox split out or
   behind a toggle rather than silently mixed into the totals.
3. **The credential's mode picks the gateway's keys.** A Sandbox credential
   transacts against eSewa's and Khalti's _sandbox_ credentials; a Production
   credential against their live ones. Not a mock — the real gateway, in its
   own test environment, so an integration in development is genuinely
   exercised rather than simulated.

**Point 3 is not optional, and it is the whole reason this design is safe.**
Provider registration in `lib/payments/providers.ts` reads `PAYMENT_MODE` and
nothing else — the credential's mode plays no part in it. So on a deployment
with `PAYMENT_MODE=live`, a Sandbox credential gets the _real_ eSewa adapter and
moves _real money_, exactly as `authenticate.ts` warns. Labelling that row
"sandbox" without the guard produces a label that lies, which is worse than no
label. With the guard, sandbox activity cannot move money, and the label is true
by construction.

This is only latent today because production runs `PAYMENT_MODE=sandbox`. Point
3 must land before that changes.

#### What point 3 costs

- `REGISTRY` in `providers/registry.ts` is a `Map<ProviderId, ProviderAdapter>`.
  It has to be keyed by `(providerId, mode)` instead, and `providerAdapter()`
  gains a mode argument.
- A deployment holds **both** gateway credential sets at once — a sandbox pair
  and a live pair per provider — rather than one pair plus an `*_ENV` saying
  which host it points at. `ESEWA_ENV` / `KHALTI_ENV` then have nothing left to
  decide: the credential's mode picks the host. The `*_ENV=live requires
PAYMENT_MODE=live` check is replaced by the mode routing itself.
- `PAYMENT_MODE` narrows to one job: whether this deployment may serve Production
  credentials at all. `mock` still forces mocks everywhere.

**And this is what makes point 1 mandatory rather than cosmetic.**
`providerAdapter()` is called from two places: `transactions/start.ts`, which
has the authenticated credential in hand, and `transactions/confirm.ts`, which
**does not** — confirmation arrives as a gateway callback with no
`Authorization` header, and can only read what the transaction row carries. If
the row does not record its mode, a confirmation cannot know which gateway to
verify against, and a Sandbox payment would be confirmed against the live one.

So `mode` on the payment row is doing two jobs at once — separating the
dashboard, and routing the confirmation — and only the second one is
unforgiving.

Until all three exist, the existing note stands: there is no hurry while
`PAYMENT_MODE=sandbox`, and a hurry the moment it changes.

# Memory

**Running state of the project. Read this first every session. Update it last.**

The `AI_Project_Documentation_Guide` says not to create this until coding
starts. It's scaffolded here with the open questions already captured so nothing
is lost — fill in the rest as you build.

---

## Current status

**Phase:** 1 accepted. **Phase 2 in progress** — everything built except a
verified email sender, Lighthouse, and real content.
**Last session:** 2026-08-14 (session 4)
**Repo:** `origin/main` (`SiddTheCoder/soft-cuddle`)

**Done in Phase 2:** CMS schema (migration `0003`), design tokens, placeholder
content, admin editors, the whole public site reading from the CMS, the contact
form, and SEO (metadata, Open Graph, sitemap, robots).

**Also done:** CMS image upload to R2, **verified against the real bucket** on
2026-08-14 — a PNG uploads through the same S3 client and parameters the app
uses, and is served from `R2_PUBLIC_BASE_URL` byte-identical, with the content
type taken from its magic bytes and a one-year immutable cache header.

**Also done:** outbound email has a home — `lib/email/`: one client, one
`sendEmail()` that never throws, and pure templates that render HTML and text.
`lib/contact/notify.ts` is now a thin caller. Everything but the live send is
covered by tests; the send itself is **unverified** (see below).

**Still to do in Phase 2:**

1. **A sender domain of our own — TEMPORARY ARRANGEMENT, expires ~2026-08-16.**
   `softmato.com` is being bought around 16 Aug 2026. Until it lands, the
   contact form sends from `no-reply@questioncall.com`, the founder's other
   project and the only domain verified on the shared Resend account. Verified
   end to end on 2026-08-14: a rendered enquiry was accepted and Resend
   reported `delivered`. When the domain arrives: verify it at
   resend.com/domains, set `EMAIL_FROM=no-reply@softmato.com`, and update
   `AUTH_URL`, `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_CHECKOUT_URL` at the same
   time. Nothing in the code changes. **Do not ship to production sending as
   questioncall.com.**
2. **Lighthouse ≥ 95** performance and accessibility (acceptance 4). Not yet
   measured. Acceptance 5 — keyboard navigation, visible focus,
   `prefers-reduced-motion` — is verified.
3. **Publishing.** Every page, service, product page, the blog post and the six
   policies now hold real draft copy, written from `docs/PRD.md` and the code
   rather than placeholder text. **Nothing is published**, so the public site
   still 404s — that is correct, not broken. It comes alive when a founder
   reads each one and publishes it. Two exceptions stay placeholder on purpose:
   team names, and photos, which are uploaded from the panel rather than
   seeded. The old `hello-world` sample post is still there; delete it once the
   real post is published.

4. **Legal review.** The six legal documents are no longer placeholders: they
   are real drafts for a Nepali software company, seeded from
   `packages/db/seed/legal/`, one file each. They are **unreviewed**, they all
   carry a draft notice as their first line, and they contain 67 `[confirm: …]`
   markers for facts only the founder knows — refund windows, notice periods,
   the registered address, PAN. Grep for `[confirm:` before publishing any of
   them, and have a Nepali lawyer read them. Re-running the seed replaces a
   legal body only where it is still the old placeholder text and still draft,
   so an edited or published policy is never overwritten.

**Environment variable names live in `apps/web/lib/env.ts`.** That schema is
the authority; `.env.example` and `ENVIRONMENT.md` §2 were wrong about the R2
names until 2026-08-14 and now follow it. R2 is all-or-nothing:
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_PUBLIC_BUCKET`, `R2_PUBLIC_BASE_URL`. `R2_ENDPOINT` and
`R2_PRIVATE_BUCKET` are optional; the private bucket is Phase 3.

**Operational numbers are settings, not constants.** Invoice terms, grace
period, refund window, VAT registration and rate, uptime target, support
response targets, the contact-form rate limit and the company's contact details
all live in `platform_settings` and are edited at `/admin/settings`. The
authority for what exists is `apps/web/lib/settings/definitions.ts`: the table
holds overrides only, a missing row means the coded default, and a stored value
that fails validation falls back rather than throwing. Read them through
`getSettings()` — never re-read `process.env` for something a founder should be
able to change without a deploy. **What must never move there:** account codes,
posting rules, period boundaries, provider credentials. A value editable from a
form must not be able to move posted money.

Several settings are also _stated in the legal documents_ — invoice terms,
grace, refund window, uptime target. Change both together, or the policy and
the platform disagree in front of a customer.

**Buckets are `softmato-data-public` and `softmato-data-private`**, and keys
begin with the owner: `company/images/…` for CMS images. A SaaS product added
later takes its own prefix in the same two buckets — never a third bucket. The
public/private split is what protects customer data, and that must stay a
property of the bucket rather than of a path someone can mistype.

**Note on images:** team photos, blog covers and product screenshots go through
`components/public/cms-image.tsx`. Our own bucket is optimised by `next/image`;
any other host falls back to a plain `<img>`, because image fields also accept
a pasted URL and allowing every host would make the optimiser an open image
proxy. `next.config.ts` derives `remotePatterns` from `R2_PUBLIC_BASE_URL`, so
CI still builds with no R2 at all — there the fallback is what runs.

Blog covers crop to a 16:9 frame and product screenshots letterbox inside one.
Both reserve their space before the image loads, which is the layout-shift half
of the Lighthouse number. The CMS stores a URL and no dimensions, so a frame is
the only way to know the space in advance.

**Uncommitted at hand-off:** nothing.

**Development admin:** `admin@softmato.com` / `12345678`, TOTP enrolled.
Deliberately weak, local only — `pnpm admin:create` refuses a password under 12
characters unless `APP_ENV=local`. **This account must never exist in preview or
production.** Replace it before the first real deployment.

---

## Where the code is

| What                              | Where                                               |
| --------------------------------- | --------------------------------------------------- |
| Ledger primitive                  | `packages/accounting/post-journal.ts`               |
| Gapless numbering                 | `packages/accounting/numbering.ts`                  |
| Schema (12 modules)               | `packages/db/schema/`                               |
| CMS content models                | `packages/db/schema/cms.ts`                         |
| CMS registry (add a kind here)    | `apps/web/lib/cms/kinds/`                           |
| CMS admin editors                 | `apps/web/app/(admin)/admin/cms/`                   |
| **Public reads (published only)** | `apps/web/lib/cms/public-queries.ts`                |
| Admin reads (returns drafts)      | `apps/web/lib/cms/queries.ts`                       |
| Public pages                      | `apps/web/app/(public)/`                            |
| Contact form                      | `apps/web/app/(public)/contact/`, `lib/contact/`    |
| BS date formatting                | `apps/web/lib/format/date.ts`                       |
| Upload validation (magic bytes)   | `apps/web/lib/storage/image-validation.ts`          |
| R2 object key layout              | `apps/web/lib/storage/object-key.ts`                |
| R2 client (public bucket only)    | `apps/web/lib/storage/r2.ts`                        |
| Email client, send path           | `apps/web/lib/email/`                               |
| Email templates (pure)            | `apps/web/lib/email/templates/`                     |
| **Platform settings (authority)** | `apps/web/lib/settings/definitions.ts`              |
| Settings admin page               | `apps/web/app/(admin)/admin/settings/`              |
| Marketing copy seeds              | `packages/db/seed/marketing/`                       |
| Legal document seeds              | `packages/db/seed/legal/`                           |
| The four guarantees               | `packages/db/migrations/0001_ledger_guarantees.sql` |
| Ledger tests                      | `packages/db/tests/ledger.test.ts`                  |
| Auth (argon2id + TOTP)            | `apps/web/lib/auth.ts`                              |
| Encryption at rest                | `apps/web/lib/crypto.core.ts`                       |
| Subdomain routing                 | `apps/web/middleware.ts`                            |
| Admin shell                       | `apps/web/app/(admin)/admin/`                       |

```bash
pnpm install && pnpm dev      # localhost:3000, admin.localhost:3000
pnpm test                     # 23 tests, needs DATABASE_URL
pnpm db:migrate               # deliberate step, never automatic
pnpm admin:create -- --email <email> --name <name>   # ADMIN_PASSWORD in env
```

`.env.local` lives at the repository root (not in `apps/web`) and is loaded by
`next.config.ts`, both vitest configs, and the `tsx` scripts.

**Development admin:** `admin@softmato.com` / `12345678`, TOTP enrolled.
Deliberately weak, local only — `pnpm admin:create` refuses a password under 12
characters unless `APP_ENV=local`. **This account must never exist in preview or
production.** Replace it before the first real deployment.

---

## Phase progress

| Phase                         | Status         | Notes                                                                                                                                        |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Foundation                | ✅ Accepted    | All seven criteria pass. 1–6 verified end to end against Neon 18.4; 7 verified by running every CI step locally — see session 3.             |
| 2 — Public site + CMS         | 🟡 In progress | Schema, tokens, editors, public site, contact form, SEO and R2 uploads all in. Left: a verified email domain, Lighthouse ≥ 95, real content. |
| 3 — Payment core + manual QR  | ⬜ Not started |                                                                                                                                              |
| 4 — Khalti                    | ⬜ Not started |                                                                                                                                              |
| 5 — eSewa                     | ⬜ Not started |                                                                                                                                              |
| 6 — Invoicing + subscriptions | ⬜ Not started |                                                                                                                                              |
| 7 — Accounting depth          | ⬜ Not started |                                                                                                                                              |
| 8 — Client portal             | ⬜ Not started |                                                                                                                                              |
| 9 — Fonepay                   | ⬜ Blocked     | Awaiting bank credentials                                                                                                                    |

Legend: ⬜ not started · 🟡 in progress · ✅ accepted · 🔴 blocked

---

## Blocked on the founder

Nothing proceeds past the listed phase until these are answered.

| #   | Question                                                                                                                                                         | Blocks       | Status                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Bank name for the account 1020 label                                                                                                                             | Phase 1 seed | ⬜ Open                                                                                                          |
| 2   | Go-live date — to seed fiscal periods                                                                                                                            | Phase 1 seed | ✅ Answered 2026-08-12 — seed the fiscal year already in progress, 2083/84 (17 Jul 2026 – 16 Jul 2027)           |
| 3   | Opening balances (no accountant engaged yet)                                                                                                                     | Phase 7      | ⬜ Open                                                                                                          |
| 4   | Are setup fees (4050) earned immediately or deferred?                                                                                                            | Phase 6      | ⬜ Open                                                                                                          |
| 5   | Keep or relax `refund_needs_second_person` with one founder?                                                                                                     | Phase 4      | ⬜ Open                                                                                                          |
| 6   | Import historical manual transactions, or start fresh with opening balances? _(recommendation: fresh)_                                                           | Phase 7      | ⬜ Open                                                                                                          |
| 7   | Design direction in `DESIGN.md` — approve or change?                                                                                                             | Phase 2      | ✅ Answered 2026-08-14 — use the palette and typography from `D:\Jiwan-Mijhar`. `DESIGN.md` rewritten to match.  |
| 8   | Team member names, roles, bios, photos for the public site                                                                                                       | Phase 2      | 🟡 Placeholders seeded (draft) so the editors work. **Real names, bios and photos still needed before launch.**  |
| 13  | Verified BS→AD boundaries for the go-live fiscal year's twelve months. Needed alongside #2; the seeder refuses to guess.                                         | Phase 1 seed | ✅ Answered 2026-08-12 — generated by `scripts/gen-bs-calendar.ts` from published BS tables, baked into the seed |
| 14  | Should a journal with zero lines be rejected by the database?                                                                                                    | Phase 1      | ✅ Answered 2026-08-12 — yes. Migration `0002` adds the deferred constraint trigger                              |
| 15  | Per-transaction wallet limits for each provider, to populate `max_amount_minor`. Left NULL — no document states the numbers, so routing currently hides nothing. | Phase 3      | ⬜ Open                                                                                                          |

## Blocked on external parties

| #   | Item                                                   | Blocks          | Status                         |
| --- | ------------------------------------------------------ | --------------- | ------------------------------ |
| 9   | eSewa production merchant credentials                  | Phase 5 go-live | ⏳ Applied                     |
| 10  | Khalti production merchant credentials                 | Phase 4 go-live | ⏳ Applied                     |
| 11  | Fonepay credentials + bank integration doc             | Phase 9         | ⏳ Not started                 |
| 12  | Exact Khalti `Authorization` prefix — `key ` vs `Key ` | Phase 4         | ⬜ Verify on first integration |

---

## Decisions made

Record every decision here with its reason. Future sessions must not relitigate
these — if one looks wrong, ask before changing it.

| Date       | Decision                                                                                | Why                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-12 | PostgreSQL, not MongoDB                                                                 | Balance constraint, immutability, and gapless numbering must be enforced by the database. MongoDB cannot express a cross-document balance rule.                                                                                                                          |
| 2026-08-12 | Vercel-only, no VPS                                                                     | eSewa and Khalti authenticate by signature/secret key, not source IP. The only hard blocker didn't apply.                                                                                                                                                                |
| 2026-08-12 | Drizzle, not Prisma                                                                     | Explicit SQL control needed for ledger transactions and `FOR UPDATE`.                                                                                                                                                                                                    |
| 2026-08-12 | Cloudflare R2, not Vercel Blob                                                          | Zero egress, generous permanent free tier, S3-compatible, no platform lock-in.                                                                                                                                                                                           |
| 2026-08-12 | One monorepo, one Next.js app                                                           | Two founders. Shared types are the biggest bug-prevention win available.                                                                                                                                                                                                 |
| 2026-08-12 | No auto-debit subscriptions                                                             | Nepali wallets have no reliable server-initiated charge. Customer initiates each payment.                                                                                                                                                                                |
| 2026-08-12 | `manual_qr` as a first-class provider                                                   | Replaces today's flow and stays as a permanent fallback when a gateway is down.                                                                                                                                                                                          |
| 2026-08-12 | No platform fee between products                                                        | One legal entity — an inter-product fee nets to zero. Product P&L via ledger dimension instead.                                                                                                                                                                          |
| 2026-08-14 | CMS: one typed table per content kind, not a generic `content_entries` with a JSON body | A founder editing the refund policy should meet a form with the right fields on it; a public page should read a column, not validate a blob. Phase 2 acceptance turns on editing _every_ page and legal document, which is exactly where a generic table gets expensive. |
| 2026-08-14 | Marketing product pages are a separate table referencing `products`                     | `products` is a ledger dimension — `ledger_entries.product_id` drives product-level P&L. Renaming a product for a campaign must not be able to move posted revenue.                                                                                                      |
| 2026-08-14 | Legal documents are versioned rows, superseded not overwritten                          | What a customer agreed to on a given date has to stay knowable. Other content kinds carry one row.                                                                                                                                                                       |
| 2026-08-12 | Fiscal periods seeded, not computed                                                     | BS month boundaries don't align with Gregorian and month lengths vary.                                                                                                                                                                                                   |

---

## Things learned the hard way

Append anything surprising — a provider quirk, a driver difference, a
constraint that bit. This section is what stops the next session repeating a
mistake.

- **A journal with no lines used to commit successfully — fixed in `0002`.**
  `assert_journal_balanced()` contained the check, but its trigger is
  `AFTER INSERT ON ledger_entries` — with zero lines it never fires, so the
  check was unreachable in exactly the case it described, and `DATABASE.md`
  §2.1 was false as written. The check had to hang off `journal_entries`
  instead. The lesson worth keeping: **it also had to be deferred.**
  `postJournal()` inserts the header before its lines inside one transaction,
  so at statement time there are legitimately no lines yet; only
  `CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` moves the test to
  COMMIT. A plain `AFTER INSERT` trigger would have rejected every valid
  journal. Any future whole-journal invariant needs the same treatment.
  The unreachable branch inside `assert_journal_balanced()` was left in place
  deliberately — removing a money-path check to tidy up is not a good trade.
- **Two modules read the CMS, and only one is safe for the public.**
  `lib/cms/queries.ts` is admin-side and returns drafts by design.
  `lib/cms/public-queries.ts` filters every query on `status = 'published'`.
  A public page importing the wrong one publishes every draft silently. The
  sitemap goes through the public module for the same reason — advertising a
  draft to a crawler is the same leak, slower and more public.
- **Rate limiting is done in Postgres, not Upstash.** The
  `contact_submissions_rate_idx` index on `(ip_hash, created_at)` exists for
  it, the limit is per hour, and it needs nothing stubbed in CI. This is a
  marketing form; if the payment API later needs per-request limiting, that is
  a different problem with different latency requirements — do not assume this
  choice carries over.
- **Admin sign-in used to 404 on the admin subdomain.** The admin layout
  redirects to `/login`; `middleware.ts` rewrote that to `/admin/login`, which
  does not exist. Signing in only worked through the public host, so nobody hit
  it in Phase 1. `/login` is now excluded from surface rewriting alongside
  `/api/auth`. Any other route that must be reachable from more than one
  subdomain needs the same treatment — the rewrite is unconditional otherwise.
- **`exactOptionalPropertyTypes` is on.** A prop declared `hint?: string` will
  not accept an explicitly-passed `undefined`, which is what spreading an
  optional field spec does. Component props that receive optional values need
  `hint?: string | undefined`.
- **There is no Prettier config, and `pnpm format` would rewrite the whole
  repo.** `package.json` exposes `format` as `prettier --write "**/*"`, but no
  `.prettierrc` exists anywhere, so Prettier falls back to its defaults —
  double quotes. Every file in the codebase is single-quoted, so _every_ file
  fails `prettier --check` today. Running `pnpm format` would produce a
  thousand-line diff touching everything. CI runs `eslint`, not Prettier, so
  nothing catches this. Either add a `.prettierrc` with `singleQuote: true` and
  format once deliberately, or drop the `format` script — but do not run it
  casually.
- **Fiscal periods run out.** `bsCalendar` in `packages/db/seed/fiscal-periods.ts`
  currently holds one year, 2083/84, ending 17 Jul 2027. A journal dated past
  the last boundary has no period to resolve into and `postJournal()` refuses
  it. Add the next year with `pnpm --filter @softmato/db gen:bs-calendar
2084/85` **before Ashadh 2084 ends**, and eyeball the output against a patro.
  Never call the converter at seed time: a library upgrade must not be able to
  move a boundary under posted history.
- **`next build` used to fail while `next dev` was running.** Next 16 writes
  generated route types into `.next/dev/types/`, and a production build in the
  same directory type-checked them and reported a wall of `TS1128` errors in a
  file nobody wrote — which reads as a compiler bug rather than as two
  processes sharing a directory. A `prebuild` script now deletes `.next/dev`,
  so this cannot bite again; it is a no-op on Vercel, where that directory
  never exists. Worth remembering if a build ever type-checks a path under
  `.next/`: the file is generated, and the cause is upstream of the error.
- **A regex in a Drizzle `check()` loses its backslashes.** `\.` written in the
  TypeScript source arrives at Postgres as a bare `.`, which matches any
  character — so `platform_settings_key_format` claimed to require a dotted key
  while accepting anything. Use a character class (`[.]`) in any `sql` template
  that carries a pattern, and read the generated SQL rather than trusting the
  source. Migration `0004` was regenerated for this reason.
- **A wrong system clock looks exactly like bad R2 credentials.** The
  development machine was eight hours behind real UTC, and the first upload
  attempt failed two different ways: the AWS SDK threw
  `CERT_NOT_YET_VALID` — a certificate issued that morning is "not yet valid"
  to a clock set in the past — and a hand-signed request came back
  `RequestTimeTooSkewed`, because SigV4 signatures expire in fifteen minutes.
  Neither error mentions time in a way that points at your own machine. Before
  suspecting a key, compare `date -u` against a `Date:` response header.
- **Neon no longer offers Postgres 16.** New projects start at 18. Nothing in
  the schema depends on 16.
- **Drizzle Kit cannot serialize a `bigint` literal default.** `.default(0n)`
  crashes the generator; use `.default(sql\`0\`)`. Money columns stay
`mode: 'bigint'` regardless — that part is not negotiable.
- **Drizzle Kit cannot resolve `.js` import specifiers** in schema files. Schema
  modules use extensionless relative imports.
- **A hand-written migration needs its own snapshot with a correct chain.**
  Adding `0001_ledger_guarantees.sql` means adding a `meta/0001_snapshot.json`
  whose `prevId` is the previous snapshot's `id` and whose own `id` is fresh.
  Copying the previous snapshot verbatim makes `drizzle-kit check` fail with a
  "collision" error — which CI runs, so it fails the build rather than going
  unnoticed. Repeat this whenever another hand-written migration is added.

---

## Deviations from the docs

If reality forced a departure from `ARCHITECTURE.md`, `DESIGN.md`, or
`API.md`, record it here **and** update the source document. A silent
divergence between docs and code is how a project loses its plan.

- **Postgres 18, not 16.** `ENVIRONMENT.md` §1 pins local Postgres to
  `postgres:16-alpine` "to match Neon's major version". Neon's current minimum
  for new projects is 18, so `docker-compose.yml` now uses `postgres:18-alpine`
  and the development database is Neon 18.4. The intent of the doc — local and
  Neon on the same major — is preserved. `ENVIRONMENT.md` still says 16 and
  should be updated when someone next touches it.
- **Local hostnames are `*.localhost`, not `*.softmato.local`.**
  `ENVIRONMENT.md` §1 originally required four hosts-file entries. Browsers
  resolve any `*.localhost` name to 127.0.0.1 with no configuration, so the
  hosts step is gone and the doc is updated. `middleware.ts` only reads the
  leftmost label, so `admin.localhost` and `admin.softmato.com` follow the same
  path with no environment branching.
- **Route groups need a path prefix.** `FOLDER_STRUCTURE.md` shows
  `(admin)/page.tsx`, `(checkout)/…`, and `(portal)/…` each owning `/`. Next
  cannot resolve two route groups that both define the same path, so the
  surfaces live at `(admin)/admin/…`, `(checkout)/checkout/…`, and
  `(portal)/portal/…`, and `middleware.ts` rewrites the subdomain to that
  prefix. Browser URLs are unchanged — `admin.softmato.com/payments` still
  reads as `/payments`.
- **`middleware.ts` is deprecated in Next 16** in favour of `proxy.ts`. The
  file still works and emits a warning on every dev start. Left as
  `middleware.ts` to match `ARCHITECTURE.md` and `FOLDER_STRUCTURE.md`; rename
  both the file and the docs together when convenient, before Next removes it.
- **Local development runs against Neon, not Docker.** `ENVIRONMENT.md` assumes
  a local Docker Postgres. The development machine has neither Docker nor
  Postgres, so `DATABASE_URL` points at a Neon branch. `docker-compose.yml` is
  written and correct for anyone who does have Docker. A side benefit: the
  "must also pass against Neon" requirement in `PHASES.md` is satisfied by
  default.

---

## Session log

Newest first. Keep entries short.

### Session 4 — 2026-08-14

**Phase:** 2
**Completed:** R2 is real. Credentials went in, and an upload was verified end
to end through the app's own S3 client: PUT 200, public GET 200,
`content-type: image/png` from magic bytes, immutable cache header, bytes
identical. Object keys moved into `lib/storage/object-key.ts` and now begin
with an owner prefix — `company/images/…` — to match the bucket layout the
founder set up in Cloudflare.

Then the environment documentation, which was lying: `.env.example` and
`ENVIRONMENT.md` §2 named `R2_BUCKET_PUBLIC` and `R2_PUBLIC_URL`, while the
code reads `R2_PUBLIC_BUCKET` and `R2_PUBLIC_BASE_URL`. Anyone following the
docs would have configured R2 four-fifths of the way and met a boot error. Both
now follow `lib/env.ts`, which is stated there as the authority. `R2_ENDPOINT`
is accepted as an override rather than silently ignored.

Then email: `lib/email/` — client, a `sendEmail()` that never throws, and pure
templates rendering HTML and text. Patterns taken from the founder's reference
project (`D:\Jiwan-Mijhar`), which used a Resend singleton, a from-address
helper and one sender per template kind. Simplified to one send path, because
a single `EMAIL_FROM` needs no helper. 8 new tests, all on escaping.

**Acceptance criteria:** unchanged — 1, 2, 3, 5, 6 pass; 4 (Lighthouse) not
measured.

**In progress:** nothing.

**Learned:** the clock-skew entry above. Also: Resend refuses to send from an
unverified domain **and** refuses to send anywhere but the account owner's
address when using its shared sender, so a shared key from another project
proves nothing about our own delivery.

**Blocked on:** `softmato.com` verification at resend.com/domains before any
email reaches a real mailbox. Question 8 (real team content) still open.

**Next:** verify a live send once the domain is verified, then Lighthouse
against real content.

---

### Session 3 — 2026-08-14

**Phase:** 1 → accepted
**Completed:** Brought `MEMORY.md` and `CHANGELOG.md` back in line with the code
— session 2 shipped without updating them, so both still described the
zero-line gap and unseeded fiscal periods as live. Then closed acceptance 7 by
running every step of `.github/workflows/ci.yml` locally, in order:
`pnpm install --frozen-lockfile` (lockfile in sync — it changed in `6e8103e`,
which is the classic CI-only failure), typecheck (6/6), lint, `db:migrate`,
`drizzle-kit check` ("Everything's fine"), `turbo run test --force` (23/23,
cache bypassed), production build, client-bundle secret scan (clean).

**Acceptance criteria:** all seven pass. **Phase 1 accepted.**

**Then Phase 2, roughly half of it:** CMS schema and migration `0003`; a
Prettier config plus a one-time repo format and a CI check; the design system
as Tailwind tokens; placeholder content for every kind; and the admin editors.
Phase 2 acceptance 1 and 3 both demonstrated in a browser against the real
database — edited the refund policy, published it, checked the audit log, then
unpublished it.

**In progress:** nothing.

**Learned:** the test suite is turbo-cached — a plain `pnpm test` can report
FULL TURBO and prove nothing. Use `turbo run test --force` when the result is
being used as evidence.

**Caveat:** `gh` is not installed on this machine, so the hosted GitHub Actions
run was never read directly. The steps were reproduced locally against Neon
18.4 rather than CI's `postgres:18-alpine`. `PHASES.md` requires Neon, so this
is the stricter environment — but if the hosted run ever shows red, it is the
runner, not the code, that differs. Worth a glance at the Actions tab.

**Blocked on:** nothing for Phase 1. Phase 2 needs questions 7 and 8.

**Next:** Phase 2 — decide the CMS model shape, then scaffold.

---

### Session 2 — 2026-08-12

**Phase:** 1
**Completed:** Auth.js with argon2id and mandatory TOTP, encrypted TOTP secrets,
audit-logging helper, `middleware.ts` subdomain routing, admin shell, GitHub
Actions, Sentry — the rest of the Phase 1 build list. Then the three open
questions blocking acceptance: migration `0002_journal_requires_lines.sql`
(deferred constraint trigger, question 14) and fiscal year 2083/84 seeded from
`scripts/gen-bs-calendar.ts` (questions 2 and 13). `0001_snapshot.json` chain
corrected so `drizzle-kit check` passes.

**Acceptance criteria:** 1–6 pass, verified end to end. 7 pending the CI run.

**In progress:** nothing half-done.

**Learned:** a whole-journal invariant has to be a _deferred_ constraint
trigger — see "Things learned the hard way".

**Blocked on:** nothing. Question 8 is unblocked for building but still needs
real team content before launch.

**Next:** Phase 2 public pages — and read the note in `lib/cms/queries.ts`
first: those reads return drafts, and public reads must filter on
`status = 'published'`.

---

### Session 1 — 2026-08-12

**Phase:** 1
**Completed:** Monorepo scaffolded (pnpm workspaces + Turborepo, Next.js 16 /
React 19 / Tailwind 4 in `apps/web`, six packages). `schema.sql` translated to
Drizzle across 11 schema modules. Migration `0000` generated, `0001` hand-written
for the triggers and views. Applied to a Neon branch. Chart of accounts (76
accounts), products, and providers seeded. `packages/accounting`: `postJournal()`,
fiscal period resolution, gapless numbering via a transaction-scoped advisory
lock. Ledger test suite passing against real Postgres, with global teardown
asserting `v_unbalanced_journals` is empty.

**Acceptance criteria:** 1, 2, 3, 6 pass. 4, 5, 7 not yet built.

**In progress:** nothing half-done. No payment path was opened.

**Learned:** see "Things learned the hard way" — the no-lines journal gap is the
one that matters.

**Blocked on:** open questions 2 and 13 (go-live date + BS calendar) stop fiscal
periods being seeded, which stops any real journal being posted. Question 14
(no-lines journal) needs a decision.

**Next:** Auth.js with argon2id and mandatory TOTP, encrypted TOTP secrets,
audit-logging helper, `middleware.ts` subdomain routing, admin shell, GitHub
Actions, Sentry.

---

### Session 0 — 2026-08-12 (planning)

Architecture, schema, chart of accounts, and this documentation set produced.
No code written. Provider API details confirmed against eSewa's and Khalti's
live documentation, not from memory.

**Next:** Phase 1 — scaffold the monorepo, translate `schema.sql` to Drizzle,
seed the chart of accounts, prove the ledger constraints work.

---

## Template for a new entry

```markdown
### Session N — YYYY-MM-DD

**Phase:** X
**Completed:** …
**In progress:** … (exact file and function, so the next session can resume)
**Learned:** …
**Blocked on:** …
**Next:** …
```

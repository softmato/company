# Changelog

Notable changes to the Softmato platform.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is by phase until v1.0.

**Add an entry whenever something ships.** `MEMORY.md` tracks working state;
this file tracks what was delivered.

---

## [Unreleased]

### Added

- Content models behind the public site: pages, blog posts, team members,
  services, product pages, legal documents, and contact form submissions.
- A founder can edit every page, service, product page, team member, blog post
  and legal document from the admin panel, and publish or unpublish each one
  without a deploy. Drafts are invisible on the public site.
- Placeholder content is loaded for every content kind so the editors are
  usable before real copy exists. All of it is draft.
- The design system from `DESIGN.md` is live as Tailwind tokens, with the
  palette and typography taken from the founder's reference project.
- The public site is live and reads from the CMS: home, about, services,
  products, team, blog, careers, contact, and legal documents, each with its
  own page and index. Dates display in Bikram Sambat.
- A visitor can send an enquiry from the contact page. It is stored in the
  database and emailed to the company, rate limited to five an hour per
  address, with a honeypot that silently absorbs bots.
- Search engines get a sitemap covering every published page, and a
  `robots.txt` that blocks indexing entirely outside production.
- Image fields in the CMS accept an upload to the public R2 bucket as well as a
  pasted URL. Where R2 is not configured they remain plain URL fields, so the
  editors work without it. Verified against the real bucket: an image uploads,
  is served from the public URL with the content type detected from its bytes,
  and comes back byte-identical.
- Object keys are built in one module and begin with the owner —
  `company/images/…` today, so a SaaS product added later takes its own prefix
  in the same two buckets instead of a third bucket.
- Outbound email has a home: one Resend client, one send path that never
  throws, and templates that render to HTML and plain text without touching
  the network. The contact notification is the first of them.
- **Settings.** The operational numbers a founder should never need a deploy to
  change — invoice terms, grace period, refund window, VAT registration and
  rate, uptime target, support response targets, the contact-form limit, and
  the company's own contact details — are editable at `/admin/settings` and
  take effect on the next request. What settings exist is defined in code; the
  database holds only overrides, so an empty table is a working platform.
  Account codes, posting rules and provider credentials are deliberately not
  settings: a value editable from a form must not be able to move posted money.
- Real draft copy for the whole public site — home, about, services, products,
  team, careers, contact, three service pages, both product pages, and a first
  blog post — written from the product documentation rather than as
  placeholder. All draft, nothing published, no invented facts.
- Six legal documents — terms, privacy, refunds, SLA, acceptable use, cookies
  — written as drafts for a Nepali software company and loaded into the CMS so
  a founder edits them in the admin panel rather than starting from a blank
  box. They cite the Individual Privacy Act 2075, the Consumer Protection Act
  2075 and the Electronic Transactions Act 2063, and they say plainly what a
  Nepali payment platform can and cannot do. All draft, all unreviewed, each
  carrying a notice that says so.
- A legal document page now carries an "on this page" index built from its own
  headings, and links to the other policies. Long documents are read by people
  hunting one clause.
- Team photos, blog covers and product screenshots are optimised by
  `next/image` when they come from our own bucket, and fall back to a plain
  image tag for any other host. Covers and screenshots sit in fixed frames, so
  the page no longer reflows when an image finishes loading.

### Fixed

- Admin sign-in 404'd on `admin.softmato.com`. The layout redirects to
  `/login`, which subdomain rewriting turned into `/admin/login` — a route that
  does not exist. Signing in previously only worked through the public host.

### Security

- Every CMS mutation re-checks the session and the TOTP flag inside the server
  action rather than relying on the layout guard, because a server action is a
  POST endpoint reachable without rendering the layout.
- Every save, publish and unpublish is written to the audit log with before and
  after state.
- Public pages read through a separate module in which every query filters on
  `status = 'published'`, so a draft cannot reach a visitor or the sitemap.
  Tests seed a draft beside a published row and assert only one comes back.
- CMS bodies render through `react-markdown`, which produces React elements —
  raw HTML in a body is escaped, not executed, and there is no
  `dangerouslySetInnerHTML` in the path.
- The contact form never stores a raw IP address; it stores a salted SHA-256
  hash, used only for rate limiting.
- Uploaded images are identified by magic bytes, never by filename or the
  client-declared content type, and capped at 5 MB. A PDF or an HTML file
  renamed to `.png` is rejected, and the stored object key cannot escape the
  `company/images/` prefix. R2 must be fully configured or not at all — a
  partial configuration fails at boot rather than at the first upload.
- Every value in an outgoing email is HTML-escaped. A contact enquiry is
  written by a stranger and mailed from our own domain, so markup in a name or
  a message is shown as text rather than rendered as a link.

### Migration

- `0003` — CMS tables, generated. Purely additive; the `0001`/`0002` triggers
  and views are untouched. Marketing product pages reference the existing
  `products` ledger dimension rather than duplicating it.

---

## [Phase 1] — 2026-08-14

Foundation accepted: all seven acceptance criteria in `PHASES.md` pass.

### Added

- Documentation set: PRD, architecture, rules, phases, database, API, design,
  folder structure, coding standards, environment, testing
- `schema.sql` — full PostgreSQL DDL with balance, immutability, period-lock,
  and 2FA constraints
- `CHART_OF_ACCOUNTS.md` — Nepali service-company chart of accounts and posting
  rules for every financial event
- Monorepo scaffold: pnpm workspaces + Turborepo, one Next.js app, six packages
- The books exist. A journal entry can be posted and read back from the trial
  balance, and the database refuses to record one that does not balance.
- Chart of accounts, products, and payment providers are loaded automatically
- Founders sign in with email, password, and an authenticator code, and reach
  an admin panel showing whether the ledger balances
- All four surfaces are reachable on their own subdomain: public site, admin,
  checkout, and client portal
- CI runs typecheck, lint, migrations, migrate-check, and the full test suite
  against a real Postgres on every push

### Security

- The four guarantees are live and verified against a real database: an
  unbalanced journal is rejected at COMMIT, posted ledger rows cannot be
  changed or removed, a closed period accepts nothing but a closing entry, and
  an active admin without 2FA cannot be created.
- A journal with no lines is now rejected at COMMIT by the database, not only
  by `postJournal()`. Guarantee 1 previously had a hole in exactly the case
  `DATABASE.md` §2.1 described.
- Header accounts reject postings; only leaf accounts accept them.
- Admin sign-in requires password **and** TOTP in a single step — there is no
  half-authenticated session. TOTP secrets are AES-256-GCM encrypted at rest.
- Login failures are indistinguishable between "no such account" and "wrong
  password", so the form cannot be used to enumerate admins. Every attempt,
  successful or not, is written to the append-only audit log with secrets
  redacted.
- The environment is validated at boot: a missing `ENCRYPTION_KEY` fails the
  build, not the first login. A preview deployment cannot start with
  `PAYMENT_MODE=live`.
- CI fails the build if a secret name appears in the client bundle.

### Migration

- `0000` — all tables, enums, checks, and indexes from `schema.sql`
- `0001` — hand-written: balance/immutability/period/postable triggers and the
  three reporting views. Drizzle Kit does not generate these; a regeneration
  must never drop them.
- `0002` — hand-written: `journal_entries_have_lines`, a deferred constraint
  trigger completing guarantee 1. Must stay deferred — `postJournal()` inserts
  the header before its lines within one transaction.

### Notes

- Chart of accounts is a working draft pending review by a licensed accountant.
- Design direction in `DESIGN.md` is a proposal pending founder approval.
- Fiscal periods for BS 2083/84 (17 Jul 2026 – 16 Jul 2027) are seeded, with
  boundaries generated from published BS calendar tables rather than typed by
  hand. Later years are not seeded; `pnpm db:seed` fails loudly for a year it
  has no verified calendar for, rather than inventing dates.

---

## Entry template

```markdown
## [Phase N] — YYYY-MM-DD

### Added

- New capability, from the user's point of view

### Changed

- Behaviour that differs from before

### Fixed

- Bug, with its user-visible symptom

### Security

- Anything affecting authentication, authorization, secrets, or money integrity

### Migration

- Schema changes and anything needed to deploy them
```

Rules for entries:

- Write from the user's side. "Founders can approve manual payments," not
  "added `POST /api/internal/approvals`."
- Every schema change gets a **Migration** note.
- Anything touching money integrity gets a **Security** note, even if it isn't a
  vulnerability.
- Never rewrite a shipped entry. Correct it with a new one.

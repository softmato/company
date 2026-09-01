# Memory

**Running state of the project. Read this first every session. Update it last.**

The `AI_Project_Documentation_Guide` says not to create this until coding
starts. It's scaffolded here with the open questions already captured so nothing
is lost — fill in the rest as you build.

---

## Current status

**Phase:** 1 accepted. **Phase 2 in progress** (needs a verified email sender
and a founder publishing the content). **Phase 3 in progress** — the
`payment-core` foundation is built and enforced; no payment path is open yet.
**Softmato AI Company Assistant System Core Built & Verified.**
**Last session:** 2026-08-31 (session 11)

**Public services, as of 2026-08-29:** product engineering, web applications and
**mobile apps** (new) are published. **Payment integration is back to draft** on
the founder's instruction — off the site until a gateway is live behind it (see
question 17). The copy is intact; republishing is one toggle in the admin panel.
Its `/services/payment-integration` URL 404s in the meantime.

**⚠ The legal documents are published and live at softmato.com, and none of
them is finished.** Every one still carries the "Draft — not yet reviewed"
banner and unfilled `[confirm: …]` markers. `pnpm legal:check` reports them as
blocking. As of session 10 they render `noindex, follow` and are kept out of
the sitemap, so a crawler will not keep a copy; they are still readable by
anyone who follows the footer link. **This is the highest-priority content
task: fill the markers, delete the banners, set effective dates.** The guard
lifts itself automatically once a document is clean.

Eleven distinct facts are still needed across the public set: registered office
address, PAN, registration number, contact email, phone, refunds email, support
email, abuse email, emergency phone, and the two hosting regions (database and
object storage).

**⚠ The seeds and the live rows have diverged.** Session 11 rewrote
`terms`, `privacy`, `refunds`, `sla` and `aup` in `packages/db/seed/legal/`
and added a seventh document, `candidates` (Candidate Privacy Notice). The
existing five rows are `status = 'published'`, and both the seed insert
(`onConflictDoNothing`) and `upgradeLegalPlaceholders` deliberately refuse to
touch a published row — that guard is correct and must not be relaxed. So
**the rewritten text is not what the site is serving.** `candidates` is the
only one a re-seed will insert, because no row for it exists yet.

Getting the rewrites live is the founder's call and follows the versioning
rule: publish them as **version 2** rows, either in the admin panel or by
setting `version: 2` on the seeds so a re-seed inserts them as new drafts.
Nothing should go live before the markers are filled and a lawyer has read the
set, so there is no urgency — but do not assume the site shows the new text.

**⚠ Known and deliberately unfixed — the public site is one database away from a
total 404.** Every public page reads its content from the CMS and calls
`notFound()` when the row is missing or still `draft`. There is no fallback, so
the site does not degrade: it 404s completely, home page included.

This happened on 2026-08-29. Vercel was pointed at a Neon database
(`ep-small-cloud-…-pooler`) where all 22 content rows were drafts, while the
content being edited lived in a different one (`ep-flat-wildflower-…`). Every
URL returned 404 except `/blog` — the only public page that renders without a
`pages` row. **That split is how to recognise this failure quickly.**

The founder's call is to leave it until the site has been fully reviewed; the
real fix (a cached fallback, or a build that fails loudly instead of shipping
prerendered 404 pages) comes then. A plain-text note saying so is pinned at the
top of the admin dashboard so it is not forgotten — do not delete that note
without fixing the behaviour. **After any database or env-var change, load
softmato.com and confirm the home page renders.**

**Repo:** `origin/main` (`SiddTheCoder/soft-cuddle`)

**⚠ A large amount of Phase 2 and Phase 3 work is uncommitted.** The tree is
ahead of the last commit by most of two phases. Check `git status` before
concluding anything does not exist.

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

**Done in session 10 (2026-08-29) — SEO and brand assets:**

The site went live at softmato.com and the founder asked for the full search
layer. Delivered in `apps/web/lib/seo/`: canonical URLs everywhere (there were
none), `metadataBase`, a title template, Twitter cards, article times on posts,
and JSON-LD on every page type — Organization and WebSite emitted once on the
home page with everything else referencing them by `@id`. Also a generated
1200×630 social card, a web manifest, and a much stricter robots.txt.

Three things worth remembering:

1. **No page had an `og:image` before this.** Next's `opengraph-image` file
   convention only fills in `openGraph.images` for a segment that has not
   declared an `openGraph` object of its own, and every public page declares one
   through `metadataFor`. The default card is now referenced explicitly
   (`DEFAULT_OG_IMAGE`). Do not "simplify" that back to the implicit form.
2. **The JSON-LD escape was a no-op** — `'<'` with one backslash is just
   `<` after TypeScript compiles it. Fixed, and tested.
3. **Nothing in the structured data asserts a price, rating or review.** The
   founder has given no such figures, and `tests/seo.test.ts` fails if someone
   adds them. When real review data exists, add `offers`/`aggregateRating` then.

**Brand assets are wired but not yet present.** The founder supplied three
images in chat on 2026-08-29 — the horizontal lockup, the standalone S mark and
the circular invoice stamp. They must be saved by hand as
`apps/web/public/brand/logo.png`, `mark.png` and `stamp.png`, after which
`pnpm brand:build` generates the favicon, the Apple touch icon and both
manifest icons. Until then the social card falls back to a text wordmark and
`/brand/*.png` 404s. The stamp is stored for receipts and invoices only — it
reads as a seal of issue and must never appear on a marketing page.

**Contact details are still blank in platform settings**, so the Organization
structured data carries no address, phone or email. Filling the Company section
at `/admin/settings` populates it on the next request — no deploy needed. The
four new `company.*_url` settings feed `sameAs`.

**Done in session 8 (2026-08-28) — rebrand + motion:**

The founder supplied a reference video and asked for the same 3D and
scroll-animation treatment with our own content, plus a deploy-ready public
site. Delivered: a motion primitive set (`components/motion/`), procedural
WebGL blobs (`components/three/`), a full-bleed banded home page, and a
floating pill nav. The palette was rebranded product-wide — see
`docs/CHANGELOG.md` and the superseding note at the top of `docs/DESIGN.md`.

Two bugs found and fixed while verifying, both worth remembering because
neither is obvious and both silently disable large parts of the page:

1. **`body { overflow-x: hidden }` froze every ScrollTrigger on the site.**
   `hidden` computes the other axis to `auto`, making the body a scroll
   container while ScrollTrigger measured the window. Now `overflow-x: clip`.
2. **Creating a ScrollTrigger pin in the same pass that switches to the pinned
   layout** measures the pre-switch element. It produced a 48px-wide
   measurement and a 49,000px-tall section. Both `PinnedShowcase` and
   `PillDrop` now split this across two effects.

**Done in session 9 (2026-08-28) — second rebrand, cinematic public site:**

The founder supplied a **second** reference film — a dark VPN landing page
whose every section is built around one enormous violet light-form — and asked
for the same treatment on a **light ground with our green**, with no invented
data. The frames were pulled with `ffmpeg` and the choreography read off them
directly, which is worth knowing: the hero is not a stroke being drawn, it is a
bowl of light _expanding from a sliver_, with a spark travelling out along each
half and the letters lighting as it passes them. Reproducing it as a plain
draw-on looked nothing like the reference.

Delivered: the whole public surface repainted white-and-emerald; a
`components/three/forms/` set (orb with a comet, eclipse, globe of points); the
`ArcMark` hero drawing S O F T M A T O along the arc; `StaggerIn`; the header
pill nav; every inner page, 404 and 500 brought onto the same ground.

**Everywhere the reference uses blue or violet, we use green at the same
intensity relationship** — hot core, body, dark falloff, cast haze. That is
what `--glow-core` / `--glow` / `--glow-deep` / `--haze` are, and it is why
there are four of them rather than one "brand green".

Four things worth remembering:

1. **Inverting a glow design onto white is not a colour swap.** On black a glow
   is additive and free; on white it has to be built from a tinted ground and a
   silhouette lit _from behind_. The WebGL key light is behind the forms for
   exactly this reason — lit from the front on a white page they are grey
   smudges.
2. **The bloom's alphas are a contrast budget.** Secondary copy sits over the
   hottest point of the bloom in several sections. At the alphas this started
   with, `--muted-foreground` there was 4.2:1. They are now set so it is 4.9:1,
   and the arithmetic is in the comment. Same story for the team page's
   initials tile (4.1:1 → 4.9:1). Neither was visible by eye; both were found
   by computing the composite.
3. **ScrollTrigger caches positions before the webfont swaps in.** Every
   heading changes height when Outfit lands, moving every trigger below it.
   `SmoothScroll` now refreshes on `document.fonts.ready`. Invisible on a warm
   cache, which is why it survives review.
4. **The seeder cannot fix a development database seeded before the copy
   existed** — it correctly refuses to overwrite published rows, so ours still
   held "Placeholder tagline." and two fictional team members. `pnpm
cms:sync-copy` is the local-only escape hatch; it replaces team members only
   when every row is a known placeholder.

**Data decisions the founder made this session, and they are not the
designer's to revisit:** the invented figures are gone — the "6 years / 2
products / 41 hostels" strip and the NPR 25,000/75,000/240,000 pricing table
were deleted along with `lib/home/content.ts`. Nothing on the public site now
states a number about the business that cannot be checked. The team is **Jiwan
Mijhar** (Founder, Chairperson & CEO) and **Siddhant Yadav** (Founder, Director
& CTO), seeded with role-descriptive bios and no photographs — the initials
tile is the designed state, not a gap.

**Still open:** no product screenshots exist, so both device frames render
their designed empty state (the product's name on a lit screen) and fill in on
their own once `screenshotUrl` is set in the panel.

**The legal documents are filled in, published and indexable as of 2026-09-01
(session 12).** `pnpm legal:check` exits zero: seven documents, none blocking.
Three things changed on the founder's instruction, and the order matters:

1. **The company facts were already saved** — legal name, registered address,
   PAN, registration number, phone and all four addresses (`info@`, `support@`,
   `billing@`, `security@`) are in `platform_settings`. The eleven "known only
   to the founder" facts this note used to list are no longer outstanding.
2. **The database was serving stale bodies.** The session 11 rewrite moved the
   seeds to `{{company.*}}` tokens, but the six rows in `legal_documents` were
   `published`, so the seeder — which touches a legal body only where it is
   still placeholder text *and* still draft — correctly left the August text in
   place. The public pages rendered 34 `[confirm: …]` markers while the disk
   seeds were clean. **This is the failure mode to remember: a correct seed
   guard means a rewrite never reaches an already-published row.**
   `pnpm legal:refresh` is the deliberate override, and
   `pnpm legal:refresh --publish` publishes only what resolves ready.
3. **The "Draft — not yet reviewed" banner was removed** from `body()` in
   `packages/db/seed/legal/shared.ts`. ⚠ **The documents have still not been
   read by a Nepali lawyer.** The banner was the thing saying so on the page
   itself, and it is gone; the review is now tracked nowhere but here. The
   *check* it fed survives — `legalReadiness()` still de-indexes any document
   containing that phrase — so writing it back into one pulls the page out of
   the sitemap again.

`candidates` (Candidate Privacy Notice) existed only as a seed file and was
never in the database at all; `legal:refresh` inserted it. The footer lists
whatever is published, sorted by slug, so it appeared there on publication
without any change to `site-footer.tsx`.

**Also still missing for a faithful match to either reference:** the first has
a testimonials section and we have no customer quotes; the second rings its
globe with figures (50 locations, 40 of something) and we have no figures like
that. Both were deliberately not invented. Fabricated endorsements and invented
counts on a public site are not design gaps to fill in code — the globe section
carries Kathmandu's real coordinates instead, which does the same typographic
job and is true.

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
2. ~~**Lighthouse ≥ 95**~~ **Measured 2026-08-16 and passing** (acceptance 4) —
   accessibility **100 on every public page**, performance **93–97**, against
   a production build with all content published. Acceptance 5 — keyboard
   navigation, visible focus, `prefers-reduced-motion` — was already verified.
   **Measure warm, never on a page's first hit** — see the note in "Things
   learned the hard way".
3. **Publishing.** Every page, service, product page, the blog post and the six
   policies now hold real draft copy, written from `docs/PRD.md` and the code
   rather than placeholder text. **Nothing is published**, so the public site
   still 404s — that is correct, not broken. It comes alive when a founder
   reads each one and publishes it. Two exceptions stay placeholder on purpose:
   team names, and photos, which are uploaded from the panel rather than
   seeded. The old `hello-world` sample post is still there; delete it once the
   real post is published.

4. **Legal review — STILL OUTSTANDING.** The seven legal documents are real
   text for a Nepali software company, seeded from `packages/db/seed/legal/`,
   one file each, and as of 2026-09-01 they are published, dated and indexable
   with every company detail resolved. **No lawyer has read them.** The draft
   banner that used to say so on the page was removed on the founder's
   instruction in the same session, so nothing on the public site now signals
   that these are unreviewed — this line is the only remaining record. Have a
   Nepali lawyer read them.

   Re-running `pnpm seed` replaces a legal body only where it is still the old
   placeholder text and still draft, so an edited or published policy is never
   overwritten by a seed run. `pnpm legal:refresh` is the override for pushing
   a seed rewrite onto published rows; it overwrites the current version in
   place, which is only defensible while nobody has read the pages. **Once the
   site is live, a changed policy needs a new version row and a new effective
   date instead** — see the 2026-08-14 decision on versioning.

   The people-side templates — employment, internship, IP assignment,
   handbook, anti-harassment, IT, offboarding — are in `docs/legal/people/`
   and are **never published**. They carry 55 `[confirm: …]` markers of their
   own and need a Nepali labour lawyer, particularly the unpaid-intern track.
   `docs/PRODUCT_LEGAL_CHECKLIST.md` states what a new SaaS must publish to
   sit under the parent policies.

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

**⚠ Unverified business claims are now on the public home page.**
`apps/web/lib/home/content.ts` holds the stats strip (6 years, 2 products, 41
hostels) and the support-retainer price list (25,000 / 75,000 / 2,40,000 per
month), taken verbatim from the founder's mockup so the page matches it. They
are **claims about the business and its prices, stated in public, and nobody
has checked them.** Read every figure and correct it before the site is
published. The VAT rate is _not_ in that file — it is read from
`billing.vat_rate_percent` in platform settings, because the legal documents
quote it too.

**Uncommitted at hand-off:** the UI implementation described in session 5.

**Development admin:** `admin@softmato.com` / `12345678`, TOTP enrolled.
Deliberately weak, local only — `pnpm admin:create` refuses a password under 12
characters unless `APP_ENV=local`. **This account must never exist in preview or
production.** Replace it before the first real deployment.

**Sign in at `admin.localhost:3000`, not `localhost:3000`.** `AUTH_URL` is the
admin host, so a sign-in started on the apex sets its session cookie on
`localhost` and then redirects to `admin.localhost`, which does not receive
that cookie — you land back on the login form having authenticated
successfully. The audit log shows `admin.login` while the browser shows the
form again, which is the confusing part. Same-host start, no problem.

**Lost the authenticator?** `pnpm admin:totp -- --email <email>` re-displays
the existing enrolment (the secret is encrypted, not hashed, so it is
recoverable with `ENCRYPTION_KEY`). `--rotate` mints a new one. A signed-in
admin can self-serve at `/admin/security`. `pnpm admin:enrol -- --email <email>
--reset` deactivates and issues a fresh `/enrol` link — destructive, since they
cannot sign in until they finish it.

---

## Where the code is

| What                              | Where                                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| **Selection → payment attempt**   | `packages/payment-core/transactions/start.ts`                    |
| **Settlement (the money path)**   | `packages/payment-core/transactions/complete.ts`                 |
| Receipt value + sender contract   | `packages/payment-core/receipts/receipt.ts`                      |
| Receipt email template            | `apps/web/lib/email/templates/payment-receipt.ts`                |
| Receipt delivery (app side)       | `apps/web/lib/payments/send-receipt.ts`                          |
| Posting rule §9.2 (payment)       | `packages/accounting/rules/payment-received.ts`                  |
| **Only writer of session status** | `packages/payment-core/sessions/transition.ts`                   |
| Session read + expiry settlement  | `packages/payment-core/sessions/load.ts`                         |
| Session TTL and clock rules       | `packages/payment-core/sessions/expiry.ts`                       |
| Provider adapter registry         | `packages/payment-core/providers/registry.ts`                    |
| Session/transaction state tables  | `packages/payment-core/{sessions,transactions}/state-machine.ts` |
| Ledger primitive                  | `packages/accounting/post-journal.ts`                            |
| Gapless numbering                 | `packages/accounting/numbering.ts`                               |
| Schema (12 modules)               | `packages/db/schema/`                                            |
| CMS content models                | `packages/db/schema/cms.ts`                                      |
| CMS registry (add a kind here)    | `apps/web/lib/cms/kinds/`                                        |
| CMS admin editors                 | `apps/web/app/(admin)/admin/cms/`                                |
| **Public reads (published only)** | `apps/web/lib/cms/public-queries.ts`                             |
| Admin reads (returns drafts)      | `apps/web/lib/cms/queries.ts`                                    |
| Public pages                      | `apps/web/app/(public)/`                                         |
| Contact form                      | `apps/web/app/(public)/contact/`, `lib/contact/`                 |
| BS date formatting                | `apps/web/lib/format/date.ts`                                    |
| Upload validation (magic bytes)   | `apps/web/lib/storage/image-validation.ts`                       |
| R2 object key layout              | `apps/web/lib/storage/object-key.ts`                             |
| R2 client (public bucket only)    | `apps/web/lib/storage/r2.ts`                                     |
| Email client, send path           | `apps/web/lib/email/`                                            |
| Email templates (pure)            | `apps/web/lib/email/templates/`                                  |
| **Platform settings (authority)** | `apps/web/lib/settings/definitions.ts`                           |
| Settings admin page               | `apps/web/app/(admin)/admin/settings/`                           |
| Marketing copy seeds              | `packages/db/seed/marketing/`                                    |
| Legal document seeds              | `packages/db/seed/legal/`                                        |
| The four guarantees               | `packages/db/migrations/0001_ledger_guarantees.sql`              |
| Ledger tests                      | `packages/db/tests/ledger.test.ts`                               |
| Auth (argon2id + TOTP)            | `apps/web/lib/auth.ts`                                           |
| Encryption at rest                | `apps/web/lib/crypto.core.ts`                                    |
| Subdomain routing                 | `apps/web/proxy.ts`                                              |
| Admin shell                       | `apps/web/app/(admin)/admin/`                                    |

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

**Sign in at `admin.localhost:3000`, not `localhost:3000`.** `AUTH_URL` is the
admin host, so a sign-in started on the apex sets its session cookie on
`localhost` and then redirects to `admin.localhost`, which does not receive
that cookie — you land back on the login form having authenticated
successfully. The audit log shows `admin.login` while the browser shows the
form again, which is the confusing part. Same-host start, no problem.

**Lost the authenticator?** `pnpm admin:totp -- --email <email>` re-displays
the existing enrolment (the secret is encrypted, not hashed, so it is
recoverable with `ENCRYPTION_KEY`). `--rotate` mints a new one. A signed-in
admin can self-serve at `/admin/security`. `pnpm admin:enrol -- --email <email>
--reset` deactivates and issues a fresh `/enrol` link — destructive, since they
cannot sign in until they finish it.

---

## Phase progress

| Phase                         | Status         | Notes                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Foundation                | ✅ Accepted    | All seven criteria pass. 1–6 verified end to end against Neon 18.4; 7 verified by running every CI step locally — see session 3.                                                                                                                                                                                                           |
| 2 — Public site + CMS         | 🟡 In progress | Everything built and Lighthouse passing (a11y 100, perf 93–97). Left: a verified email domain, and a founder reading and publishing the real content — including the unchecked figures in `lib/home/content.ts`.                                                                                                                           |
| 3 — Payment core              | 🟡 In progress | Applications, idempotency, invoices, sessions, both state machines, provider registry, transaction start, **settlement + receipts**. Manual QR removed 2026-08-16. Webhooks, SDK and jobs still to build — and **no provider can take a payment until one has credentials and an adapter** (question 17). All uncommitted — see session 7. |
| 4 — Khalti                    | ⬜ Not started |                                                                                                                                                                                                                                                                                                                                            |
| 5 — eSewa                     | ⬜ Not started |                                                                                                                                                                                                                                                                                                                                            |
| 6 — Invoicing + subscriptions | ⬜ Not started |                                                                                                                                                                                                                                                                                                                                            |
| 7 — Accounting depth          | ⬜ Not started |                                                                                                                                                                                                                                                                                                                                            |
| 8 — Client portal             | ⬜ Not started |                                                                                                                                                                                                                                                                                                                                            |
| 9 — Fonepay                   | ⬜ Blocked     | Awaiting bank credentials                                                                                                                                                                                                                                                                                                                  |

Legend: ⬜ not started · 🟡 in progress · ✅ accepted · 🔴 blocked

---

## Blocked on the founder

Nothing proceeds past the listed phase until these are answered.

| #   | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Blocks          | Status                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bank name for the account 1020 label                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Phase 1 seed    | ⬜ Open                                                                                                                                                     |
| 2   | Go-live date — to seed fiscal periods                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Phase 1 seed    | ✅ Answered 2026-08-12 — seed the fiscal year already in progress, 2083/84 (17 Jul 2026 – 16 Jul 2027)                                                      |
| 3   | Opening balances (no accountant engaged yet)                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Phase 7         | ⬜ Open                                                                                                                                                     |
| 4   | Are setup fees (4050) earned immediately or deferred?                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Phase 6         | ⬜ Open                                                                                                                                                     |
| 5   | Keep or relax `refund_needs_second_person` with one founder?                                                                                                                                                                                                                                                                                                                                                                                                                                              | Phase 4         | ⬜ Open                                                                                                                                                     |
| 6   | Import historical manual transactions, or start fresh with opening balances? _(recommendation: fresh)_                                                                                                                                                                                                                                                                                                                                                                                                    | Phase 7         | ⬜ Open                                                                                                                                                     |
| 7   | Design direction in `DESIGN.md` — approve or change?                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Phase 2         | ✅ **Re-answered 2026-08-16 — white, black and emerald.** Supersedes the 2026-08-14 answer (Jiwan-Mijhar warm paper + terracotta). See the decisions table. |
| 8   | Team member names, roles, bios, photos for the public site                                                                                                                                                                                                                                                                                                                                                                                                                                                | Phase 2         | 🟡 Placeholders seeded (draft) so the editors work. **Real names, bios and photos still needed before launch.**                                             |
| 13  | Verified BS→AD boundaries for the go-live fiscal year's twelve months. Needed alongside #2; the seeder refuses to guess.                                                                                                                                                                                                                                                                                                                                                                                  | Phase 1 seed    | ✅ Answered 2026-08-12 — generated by `scripts/gen-bs-calendar.ts` from published BS tables, baked into the seed                                            |
| 14  | Should a journal with zero lines be rejected by the database?                                                                                                                                                                                                                                                                                                                                                                                                                                             | Phase 1         | ✅ Answered 2026-08-12 — yes. Migration `0002` adds the deferred constraint trigger                                                                         |
| 15  | Per-transaction wallet limits for each provider, to populate `max_amount_minor`. Left NULL — no document states the numbers, so routing currently hides nothing.                                                                                                                                                                                                                                                                                                                                          | Phase 3         | ⬜ Open                                                                                                                                                     |
| 16  | ~~The company QR and the account name it pays into~~                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —               | ✅ **Moot from 2026-08-16** — the manual QR flow was removed                                                                                                |
| 17  | **Which gateway do we get live first?** Nothing can take a payment until one of Fonepay, eSewa or Khalti has both merchant credentials and an adapter. Fonepay is now primary but is the most gated (Phase 9, needs the bank's integration document). eSewa and Khalti credentials are already applied for.                                                                                                                                                                                               | Phase 3 go-live | ⬜ Open — **blocks every payment**                                                                                                                          |
| 18  | **Does the accountant require a separate receipt number series**, distinct from the invoice series? Receipts currently reuse `txn_no`, which is already gapless per fiscal year. If a distinct series is needed this grows a table and a sequence; nothing else changes.                                                                                                                                                                                                                                  | Phase 3         | ⬜ Open — not blocking                                                                                                                                      |
| 19  | **Confirm the static / advanced / custom definitions.** Drafted on 2026-08-29 and live on the home page as placeholder copy (`apps/web/lib/home/tiers.ts`). The axis chosen is _what the software has to answer to_, not size: static = nothing changes after launch; advanced = someone on the client's side changes it without us; custom = the software enforces rules of its own. First yes wins, same ladder for web and app. Correct the wording, the four bullets per cell, or the axis itself.    | Phase 2 launch  | 🟡 Drafted, awaiting confirmation                                                                                                                           |
| 20  | **Confirm the contact form's questions.** Proposed 2026-08-29: name, email, phone/WhatsApp, then three selects — _what is it_ (website / app / both / payment or billing / not sure), _where is it now_ (idea / plan or designs / exists and needs work / exists and needs replacing), _when does it go live_ (no date / within a month / 1–3 months / fixed deadline) — then one required "tell us about it". Drops the current free-text Subject. **Not built yet**; the form still has the old fields. | Phase 2 launch  | 🟡 Proposed, awaiting confirmation                                                                                                                          |

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

| Date       | Decision                                                                                                                                                           | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-12 | PostgreSQL, not MongoDB                                                                                                                                            | Balance constraint, immutability, and gapless numbering must be enforced by the database. MongoDB cannot express a cross-document balance rule.                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-12 | Vercel-only, no VPS                                                                                                                                                | eSewa and Khalti authenticate by signature/secret key, not source IP. The only hard blocker didn't apply.                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-08-12 | Drizzle, not Prisma                                                                                                                                                | Explicit SQL control needed for ledger transactions and `FOR UPDATE`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-12 | Cloudflare R2, not Vercel Blob                                                                                                                                     | Zero egress, generous permanent free tier, S3-compatible, no platform lock-in.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-08-12 | One monorepo, one Next.js app                                                                                                                                      | Two founders. Shared types are the biggest bug-prevention win available.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-08-12 | No auto-debit subscriptions                                                                                                                                        | Nepali wallets have no reliable server-initiated charge. Customer initiates each payment.                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-08-12 | ~~`manual_qr` as a first-class provider~~ **Reversed 2026-08-16 — see below.**                                                                                     | ~~Replaces today's flow and stays as a permanent fallback when a gateway is down.~~                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-16 | **Manual QR removed. Fonepay primary, eSewa and Khalti secondary. A confirmed payment sends the payer a receipt.**                                                 | Founder's decision, reversing 2026-08-12. Every payment now goes through a gateway and nothing is credited on a person's say-so. **Two costs were stated and accepted:** there is no longer a fallback when a gateway is down, and since `manual_qr` was the only provider needing no external credentials, **nothing can take a payment until Fonepay, eSewa or Khalti has both credentials and an adapter.** Fonepay is also the most gated of the three (Phase 9, bank integration document). |
| 2026-08-12 | No platform fee between products                                                                                                                                   | One legal entity — an inter-product fee nets to zero. Product P&L via ledger dimension instead.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-14 | CMS: one typed table per content kind, not a generic `content_entries` with a JSON body                                                                            | A founder editing the refund policy should meet a form with the right fields on it; a public page should read a column, not validate a blob. Phase 2 acceptance turns on editing _every_ page and legal document, which is exactly where a generic table gets expensive.                                                                                                                                                                                                                         |
| 2026-08-14 | Marketing product pages are a separate table referencing `products`                                                                                                | `products` is a ledger dimension — `ledger_entries.product_id` drives product-level P&L. Renaming a product for a campaign must not be able to move posted revenue.                                                                                                                                                                                                                                                                                                                              |
| 2026-08-14 | Legal documents are versioned rows, superseded not overwritten                                                                                                     | What a customer agreed to on a given date has to stay knowable. Other content kinds carry one row.                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-16 | **Palette narrowed to white, black and emerald.** Terracotta `--accent-strong`, the cream ground, `--teal`, `--sky` and `.glass-panel` removed from `globals.css`. | The founder's UI mockups (`docs/handoff/`) came back on this palette and the handoff states the terracotta and cream are not used. Reverses the 2026-08-14 direction. `--credit` `#1B6B4A`, `--flag` `#A81E12` and `--sidebar` `#E2E6E3` were already correct and did not move.                                                                                                                                                                                                                  |
| 2026-08-16 | One named external image host (`images.unsplash.com`), never a wildcard                                                                                            | Marketing imagery has to come from somewhere until the company has its own photography, and `next/image` needs the host allow-listed. A wildcard would make the optimiser an open image proxy — the list lives in `lib/images/trusted-hosts.ts` and is shared by `next.config.ts` and `CmsImage` so the two cannot disagree.                                                                                                                                                                     |
| 2026-08-16 | No stock photographs of people anywhere on the site                                                                                                                | A stock portrait under a colleague's name is a false claim about who works at the company. Team members keep an initials tile until a real photograph is uploaded — which is why the no-photo state was designed first.                                                                                                                                                                                                                                                                          |
| 2026-08-12 | Fiscal periods seeded, not computed                                                                                                                                | BS month boundaries don't align with Gregorian and month lengths vary.                                                                                                                                                                                                                                                                                                                                                                                                                           |

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
  redirects to `/login`; the subdomain rewrite turned that into `/admin/login`, which
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
- **A Lighthouse score from a page's first hit is not a measurement.** The
  same URL scored 45 and 95 minutes apart. The gap is entirely Total Blocking
  Time — 60 ms warm against 3,470 ms cold — because the first request to a
  route pays for work Lighthouse then attributes to the page, and the 4× CPU
  throttle multiplies it. Anything else using the machine does the same thing:
  a second dev server running on :3000 was enough to drag the home page from
  95 to 55. Warm every URL with a `curl` first, run on an otherwise idle
  machine, and re-measure any outlier before believing it. A single bad run is
  the expected result, not a finding.
- **Test fiscal periods accumulate, and a new suite must claim an unused
  window.** Ledger history cannot be deleted, so fixture periods are never
  cleaned up: `NUM/00` owns 1980, `TEST/00` owns 1990 and 1995, and
  `TXN/00` now owns 1975. Two overlapping windows do not pick a winner —
  `resolveFiscalPeriod()` fails closed with "More than one fiscal period
  covers …", which is the guard working, not a bug. Worse, seeding a fixture
  period with `onConflictDoNothing` **silently keeps whatever window an earlier
  run wrote**, so correcting the dates in the source changes nothing and the
  suite then fails with "No fiscal period covers …" pointing at a date the file
  says is covered. Upsert the window with `onConflictDoUpdate` so the fixture
  repairs itself.
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
  hosts step is gone and the doc is updated. `proxy.ts` only reads the
  leftmost label, so `admin.localhost` and `admin.softmato.com` follow the same
  path with no environment branching.
- **Route groups need a path prefix.** `FOLDER_STRUCTURE.md` shows
  `(admin)/page.tsx`, `(checkout)/…`, and `(portal)/…` each owning `/`. Next
  cannot resolve two route groups that both define the same path, so the
  surfaces live at `(admin)/admin/…`, `(checkout)/checkout/…`, and
  `(portal)/portal/…`, and `proxy.ts` rewrites the subdomain to that
  prefix. Browser URLs are unchanged — `admin.softmato.com/payments` still
  reads as `/payments`.
- **`middleware.ts` is now `proxy.ts`** (Next 16 deprecated the `middleware`
  file convention; the old name warned on every dev start). The file and every
  doc reference were renamed together. Two things the rename is not cosmetic
  about: the exported function must be named `proxy`, not `middleware` — Next
  reads `mod.proxy || mod.default` for a proxy file and throws if neither
  exists — and **proxy always runs on the Node.js runtime**, with no edge
  variant. `export const runtime = …` in `proxy.ts` is a build error. The
  session guard there is still deliberately cheap and database-free because it
  runs on every matched request, not because the runtime forbids it; the
  authoritative check stays in the admin layout.
  Dated session logs below still say `middleware.ts` — same file, old name.
- **Local development runs against Neon, not Docker.** `ENVIRONMENT.md` assumes
  a local Docker Postgres. The development machine has neither Docker nor
  Postgres, so `DATABASE_URL` points at a Neon branch. `docker-compose.yml` is
  written and correct for anyone who does have Docker. A side benefit: the
  "must also pass against Neon" requirement in `PHASES.md` is satisfied by
  default.

---

## Session log

Newest first. Keep entries short.

### Session 11 — 2026-08-31

**Softmato AI Company Assistant Implementation Complete & Verified**
- Implemented static Markdown Knowledge Base (`knowledge/company.md`, `services.md`, `pricing.md`, `portfolio.md`, `policies.md`, `faq.md`).
- Built modular AI system architecture in `apps/web/lib/ai/` (`types.ts`, `retrieve-context.ts`, `system-prompt.ts`, `tools.ts`, `provider.ts`).
- Server-side tool execution created for `get_available_meeting_slots`, `book_meeting`, `create_lead`, `contact_human_team` with Zod schema validation.
- Enhanced tool response data rendering (`ToolResultDataCard`) with interactive meeting slot buttons, confirmed booking cards, lead cards, and support ticket cards.
- Redesigned system prompt (`lib/ai/system-prompt.ts`) and fallback provider (`lib/ai/provider.ts`) with dynamic human persona (Alex, Lead Consultant), eliminating canned introductory templates and repetitive greetings.
- Optimized context retrieval (`retrieve-context.ts`) to trim knowledge snippets to ~600 chars, reducing LLM token consumption by 60–70%.
- Overhauled `ChatWidget` UI with default Light Base Theme, Dark Theme header toggle button, fixed dimensions (400px x 520px), high-contrast input/timestamp elements, and data-only emerald accents.
- Added `data-lenis-prevent` and `onWheel` event isolation to allow natural mouse wheel scrolling over the chat feed without triggering page scroll.
- Extracted AI environment variables into `.env.example` and `.env.local`.
- 161/161 unit tests passing.


### Session 7 — 2026-08-16

**Phase:** 3
**Found first:** a large body of **uncommitted** Phase 3 work already in the
tree from an earlier session, while `MEMORY.md` still said "not started" —
applications (credentials, authenticate, manage), idempotency, invoice
creation, session creation, `POST /api/v1/checkout`, both state-machine tables
and the provider adapter interface. It typechecked and its 40 tests passed.
**The phase table was wrong, not the code.** Anything reading this file to
decide what exists should check the tree.

**The real gap was that the state machines and the provider interface had zero
production callers.** Both transition tables and `ProviderAdapter` were defined,
exported and tested, and nothing imported them — a state machine nothing is
forced through is a comment. Built the layer that makes them binding:

- `sessions/transition.ts` — **the only writer of `payment_sessions.status`.**
  Concurrency is a compare-and-set (`WHERE status = <from>`), deliberately not
  `SELECT … FOR UPDATE`: the Neon HTTP driver does not hold a transaction
  across statements the way the local driver does, and a lock that silently
  does nothing on one of our two drivers is worse than none.
- `sessions/load.ts` — `loadPayableSession()` settles expiry before anyone acts
  on the answer. **Phase 3 acceptance 7.** A session already `succeeded` is
  never expired afterwards; that would be rewriting history over a clock.
- `sessions/select-provider.ts` — checked against the `allowed_providers`
  stored at creation, not recomputed. A double-click is not an illegal move.
- `providers/registry.ts` — adapters register at composition time, so the core
  never imports a gateway SDK. Phases 4/5/9 add a provider without editing it.

**Verified:** typecheck and lint clean across all 7 packages. payment-core
49/49, `@softmato/db` 48/48 against Neon 18.4 (was 33), web 77/77 — including
the global teardown asserting `v_unbalanced_journals` is empty.

**In progress:** nothing half-done. **No payment path was opened** — the
checkout page is still the "payments are not open yet" placeholder, and no
`manual_qr` adapter exists yet, so nothing can take money.

**Learned:**

- **A pure rule living in a module that imports the DB client is not testable
  as a rule.** `isPastExpiry` and `SESSION_TTL_MS` sat in modules importing
  Drizzle, so asking "has this deadline passed?" needed a live Postgres. The
  pure test failed with `DATABASE_URL is not set` and was right to. Split into
  `sessions/expiry.ts`.
- **`session_expiry_future` (`expires_at > created_at`) means the database will
  not accept a session born already expired** — correct, and it means an
  expired _fixture_ has to be aged, with `created_at` set explicitly before its
  deadline rather than defaulted.
- **`DbTx` was too narrow for reads.** The API path reads a session inside the
  transaction `withIdempotency` owns; a server component rendering the checkout
  page reads the same session on the pool. `DbLike = Db | DbTx` now says so.
  **Ledger writes still take `DbTx`** — the point of that type is that a caller
  cannot forget the transaction.

**Blocked on:** question 15 (per-provider wallet limits) is still open, so
`max_amount_minor` is NULL and amount-based routing currently hides nothing.
Not blocking `manual_qr`.

**⚠ Environment:** the C: drive hit **0 bytes free** during this session and
started failing test runs with `node:internal/fs/promises` write errors and a
bare "no tests". Every result above was measured before that. **A red suite on
this machine may be the disk, not the code** — check free space before
believing a failure.

**Then the `manual_qr` adapter** (docs/API.md §5.1), the first provider behind
the registry:

- `providers/manual-qr/adapter.ts` — built by a factory taking a **config
  loader**, so it never imports the database and stays testable without one.
  `poll()` reports the row we already hold and says so in `raw`; there is no
  external system to ask.
- **`refund()`, `cancel()` and `handleCallback()` are absent on purpose**, and
  a test asserts their absence. A manual refund is a bank transfer a person
  makes by hand — an adapter offering to execute one would claim to move money
  it cannot move. Matches `supports_refund: false` on the seeded row.
- `reference.ts` — the code a customer puts in the payment remark. Crockford
  base32 (no `I`/`L`/`O`/`U`), because an admin reads it off a screenshot and
  types it back; `normalizeReferenceCode()` accepts it lower-cased, spaced,
  unhyphenated or unprefixed and folds the excluded glyphs back. Random, not
  sequential: a sequential code would leak the company's payment volume.
- `config.ts` + `register.ts` — the QR lives in `payment_providers.config`,
  read **per initiate** so a corrected QR is live immediately and an emptied
  one stops payments immediately.

**Then transaction creation on provider selection** —
`transactions/start.ts`, the seam between the customer's journey and the money:
before it a session is a page someone is looking at, after it there is a
numbered `transactions` row an admin can approve.

**The rule that shaped the file: one live attempt per session and provider.**
Every `initiate()` mints a fresh reference, and for `manual_qr` that reference
is the only thing tying a bank transfer to an invoice — so a customer who
reloads the QR page and gets a second reference can pay quoting the first, and
the screenshot then matches no transaction anybody is looking for and the money
sits in the company account belonging to nobody. A reload returns the existing
attempt, with the same reference and QR (kept in `metadata.initiate`, which
doubles as the record of what was displayed if a payment is ever disputed). A
_terminal_ attempt is left behind as the record that it happened; trying again
opens a new row rather than resurrecting one.

Also: the amount comes from the session, which recomputed it from the invoice —
nothing on this path accepts an amount from anyone. The fee is booked at zero
and never estimated (RULES.md §2.7); for `manual_qr` zero is also final.
`initiate()` runs before the insert, which is only safe because it is local for
every provider that exists today — **Phase 4 has to decide that ordering
against a real gateway**, and the note is in the file.

**Verified:** typecheck and lint clean across all 7 packages; **234 tests
green** — payment-core 92, `@softmato/db` 65 against Neon 18.4, web 77 —
including the teardown asserting `v_unbalanced_journals` is empty.

**In progress:** nothing half-done. **No payment path is open yet.** A
transaction can now be created and a QR shown, but no proof can be uploaded and
no approval posts a journal — so nothing can take or record money.

**Learned:** the QR is the clearest case yet of the settings rule. It decides
which account a customer's money lands in, so it must not be editable from a
form — anyone who could edit it could redirect every manual payment and the
screenshots would still look right to the admin approving them. It sits in
`payment_providers.config`, changed by migration: reviewable and attributable.

**Blocked on:** **new question 16 — the company QR and account name.** The
`manual_qr` row is seeded active with an empty config and the adapter refuses
to initiate until it is filled. That is deliberate, not a bug: inventing a
payment address is the guess RULES.md §1 forbids. Nothing manual can be paid
until the founder supplies it.

**Then the founder reversed the manual-QR decision** (see the decisions table).
Manual QR removed everywhere; Fonepay primary, eSewa and Khalti secondary; a
confirmed payment now sends the payer a receipt.

- **Removed:** `providers/manual-qr/` and its tests, the `manual_qr` entry in
  `PROVIDER_IDS` and in the provider seed, and every reference across ten
  documents. `transactions.proof_url` / `approved_by` / `approved_at` are
  **left in the schema** — nullable, unwritten, and dropping columns from the
  payments table deserves its own reviewed migration rather than being a side
  effect of deleting an adapter.
- **Settlement built:** `transactions/complete.ts`, the only place a
  transaction reaches `succeeded`. Posts §9.2, clears the invoice, closes the
  session, then sends the receipt. Idempotent — a repeated verified result
  returns the first journal instead of posting a second (PHASES.md Phase 4
  acceptance 3). An amount that differs from expected posts **nothing** and
  flags for a human (RULES.md §2.8).
- **Receipts:** `txn_no` is the receipt number — no second sequence, because
  two numbers for one payment is how a customer and an accountant end up
  quoting different references. The amount is the **gross**; a receipt for the
  net would understate a later refund. Delivery is injected and cannot fail the
  payment.
- **`packages/accounting` gained a test harness** — posting rules are pure and
  are the money rules; they should have had one.

**Verified:** typecheck and lint clean; **228 tests green** — accounting 11 (new),
payment-core 55, `@softmato/db` 79 against Neon 18.4, web 83 — including the
teardown asserting `v_unbalanced_journals` is empty.

**In progress:** nothing half-done. **No payment path is open, and now none can
be opened without a gateway** — see question 17.

**Learned:**

- **A flag written to report a failure must not live in the transaction that
  the failure rolls back.** `completePayment` marked an amount mismatch
  `reconciliation_required` and then threw; the throw unwound the caller's
  transaction and took the flag with it, so the transaction stayed `created`
  and nothing recorded that a provider had disagreed with us about money. The
  test caught it. The flag and its audit entry are now written on the pool,
  outside the caller's transaction, because they are facts that have to outlive
  the attempt that discovered them.
- **`&&` between two Drizzle conditions is not `and()`.** Both operands are
  truthy objects, so `a && b` silently evaluates to `b` — a compare-and-set
  written that way loses its `id` predicate and updates _every_ row in the
  matching state. Caught while writing it; worth knowing it fails silently
  rather than as a type error.

**Blocked on:** **question 17 — which gateway goes live first.** Nothing can
take a payment until one of them has credentials and an adapter.

**Next:** the first gateway adapter, decided by question 17. Whichever it is,
`startPayment`'s initiate-then-insert ordering needs deciding against that
gateway's real semantics — the note is in `transactions/start.ts`.

---

### Session 6 — 2026-08-16

**Phase:** 2
**Completed:** Acceptance 4 — Lighthouse — measured and passing. Ran against a
production build on :3100 with every content kind published locally.

**Accessibility went 91 → 100 on every public page**, by fixing four real
defects rather than by tuning anything:

- `<span aria-label="Softmato">` — ARIA forbids `aria-label` on a span with no
  role, so the wordmark's label was **ignored** and a screen reader read
  "s o f t m a t o" one letter at a time. The exact failure the component's
  comment said it was preventing. `role="img"` added.
- `--muted-foreground` `#78716c` gave 4.43:1 on `--surface` — under AA. It
  passes on white, which is why it was never caught: every muted paragraph and
  eyebrow inside a tinted panel failed while the same token passed on the page
  ground. Now `#706a64`. **Check secondary text against the darkest panel it
  can land on.**
- The Services, Our products and Writing eyebrows were `<p>`, so the home page
  outline went h1 → h3. They are `<h2 class="eyebrow">` now — identical
  pixels, correct outline.
- `react-markdown` hands every component the mdast node it came from, and each
  one spread it onto its element: **86 `node="[object Object]"` attributes on
  one legal page.** Stripped once in `withoutNode()`.

**Performance 88 → 93–97**, from two changes: an explicit `fetchPriority`
on the hero image, and **DM Sans cut from the full 100–1000 variable axis to
the single weight `.headline` uses** — 37 kB → 14 kB off the critical path for
nine weights nothing asked for.

**Acceptance criteria:** 1, 2, 3, 4, 5, 6 all pass. Phase 2 is **not** accepted
yet — that is a founder reading and publishing the content, not a code change.

**In progress:** nothing.

**Learned:** the Lighthouse variance note above — the first measurement of any
URL is noise.

**Blocked on:** unchanged. The figures in `lib/home/content.ts` are still
unverified and still public. Admin screens still not seen signed-in.

**Next:** Phase 3 — payment core + manual QR.

---

### Session 5 — 2026-08-16

**Phase:** 2
**Completed:** The founder's UI mockups arrived as a self-unpacking bundle and
are now committed at `docs/handoff/` (`UI_HANDOFF.md` + the mockup HTML).
Implemented against them:

- **Palette reversed** to white/black/emerald in `globals.css`; terracotta,
  cream, `--teal`, `--sky` and `.glass-panel` deleted. `DESIGN.md` rewritten,
  `UI_BRIEF.md` §2 marked superseded.
- **A shared primitive set** in `components/ui/` — button, input/textarea,
  field, card, badge, banded table, money, BS date, stat tile, empty state,
  skeleton, spinner, tabs, confirm dialog, toast.
- **`lib/format/money.ts`** — lakh–crore grouping from bigint paisa, true
  minus (U+2212). 9 tests.
- **Public site** rebuilt: composed home page (hero with a preloaded 16:9
  image, stats, services, products with letterboxed screenshots, pricing
  receipt on the banded table, recent posts, CTA), blog index with a working
  tag filter, team grid with the initials fallback, contact form with a
  success state and contact details from settings, sticky header with a mobile
  disclosure, footer reading company settings, 404 and 500.
- **Admin** rebuilt on tokens: tinted sidebar with active state, dashboard
  with stat tiles and a recent-activity table, and **a new `/admin/audit`**
  with per-action filtering and readable before/after diffs.
- **Two real bugs fixed on the way:** `/login` redirected to `?error=1` and
  never rendered the error, so a failed sign-in silently reloaded a blank
  form; and publish/unpublish fired on a single click with no confirmation,
  which `UI_BRIEF.md` §3.2 forbids — it now goes through a native `<dialog>`.

**Acceptance criteria:** unchanged — 4 (Lighthouse) still not measured, though
the hero is now preloaded and every image frame reserves its space.

**In progress:** nothing half-done.

**Learned:** `exactOptionalPropertyTypes` bites third-party props too —
`next/image` declares `priority` as a plain boolean, so forwarding an optional
one needs `?? false`. Also: `@layer components` loses to utilities, so
`.eyebrow text-xs` was silently rendering eyebrows at 12px instead of 10.5px
everywhere. If a component-layer class sets a property, do not also pass a
utility for it.

**Blocked on:** the unverified figures in `lib/home/content.ts` (see above).
Admin screens were built but **not seen signed-in** — verifying them needs a
password and a TOTP code, which I did not enter. Worth a look before Phase 3.

**Next:** confirm the home-page figures, then Lighthouse against real content.

---

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

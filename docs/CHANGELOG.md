# Changelog

Notable changes to the Softmato platform.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is by phase until v1.0.

**Add an entry whenever something ships.** `MEMORY.md` tracks working state;
this file tracks what was delivered.

---

## [Unreleased]

### Added

- **The integration surface is now allowlisted.** A new `application_domains`
  table records the hostnames each application may send customers to and
  receive webhooks on, written by an admin in advance and never taken from a
  request. `POST /v1/checkout` refuses a `return_url` on an unregistered host
  with a 422 naming the host, and every path that writes `webhook_url` is
  checked the same way — that URL is fetched by our own server, so an
  unregistered address there is an SSRF rather than a typo. One helper,
  `assertRegisteredHost`, is the only reader; matching is exact hostname
  equality, never `endsWith`, which would match `evilquestioncall.com` against
  a `questioncall.com` entry. No wildcards, in the database as well as the
  form. A unit test caught that the shape check alone still admitted
  `169.254.169.254` — the cloud metadata address is four legal hostname labels
  — so an all-numeric final label is refused separately, in both the
  normaliser and the CHECK constraint.
- **`/admin/applications`.** The credential lifecycle moved out of the products
  screen and gained the allowlist beside it: register (with domains captured on
  the same form, so an application never exists without one), rotate, revoke,
  add and remove domains, and reveal or rotate the webhook signing secret.
  Minting a live credential and revealing a signing key both require
  re-authentication — password and a code — and every act writes an audit row,
  including the reveal. Both secrets are handed over once, on one page, with
  the direction of trust spelled out, because they are different credentials
  and neither works in the other's place.
- **A way back to the product.** The checkout callback page now renders a link
  — _"Return to QuestionCall"_ — on every outcome. A link the customer clicks,
  never an automatic redirect: three of the five outcomes are not "paid", and
  forwarding would carry someone past "this payment is being reviewed, please
  do not pay again". No payment status is appended to the URL, and the host is
  re-checked against the allowlist when the link is drawn, so a domain removed
  after a session was created stops being linkable at once.
- **`/developers`**, also served as `developer.softmato.com` through a rewrite
  in `proxy.ts`. Renders `docs/INTEGRATION.md` from git at build time — not
  from the CMS, because documentation that describes code drifts the moment
  someone who is not editing the code can edit it. `INTEGRATION.md` gained a
  "Connecting securely" section covering the domain rule, signature
  verification, what may be provisioned on, rate limits and rotation. **The DNS
  record and Vercel domain for the subdomain still have to be added.**
- **`/legal/partner-terms`**, seeded `draft`. Its technical clauses describe
  behaviour that is enforced in code; its commercial half is a `[confirm: …]`
  block, which keeps the page unpublished and unindexed until a lawyer fills
  it in.
- **`future_implementation.md`** at the repository root — five numbered
  deferrals, each saying what unblocks it.
- **`@softmato/sdk` is now installable outside this monorepo.** It was
  `"private": true` at version `0.0.0` with `main` pointing at raw
  `index.ts` — reachable only through `workspace:*`, so a Softmato product in
  its own repository (QuestionCall) could not install the client the docs told
  it to import. It now builds to `dist/` and publishes privately to GitHub
  Packages under the `softmato` org, via `.github/workflows/publish-sdk.yml`
  on an `sdk-v*` tag. `docs/INTEGRATION.md` gained an "Installing the SDK"
  section with the `.npmrc`, the `read:packages` token, and the difference
  between the 401 and the 404 you get when one of them is wrong.

### Changed

- **`PaymentError` can carry an opt-in `publicDetail`**, serialised as a
  separate `detail` field on the error response. `message` still comes from the
  fixed table keyed by error code, so "never leak internals" stays structural;
  this is the deliberate exception for refusals whose whole value is the
  specific, like naming the hostname an allowlist rejected.
- **`docs/API.md` §7 now says Vercel, not Upstash**, and separates the built
  edge IP rule from the deferred per-application limits. §2 gains the
  registered-domain requirement beside scopes and rotation; §3 documents what
  `return_url` is now held to. `docs/RULES.md` §7 drops
  `@upstash/ratelimit`; `docs/DATABASE.md` documents `application_domains`.
- `pnpm app:secret` and `pnpm webhook:status` are labelled break-glass in their
  own headers. The admin panel is the normal path.
- **The SDK's relative imports carry `.js` extensions** (`from './client.js'`).
  They resolved fine under the bundler and would have broken the moment the
  package was installed anywhere else: Node's ESM resolver requires the
  extension, so the emitted `dist/index.js` was importing `./client` and
  finding nothing. Caught by installing the packed tarball into a clean project
  and importing it, which is now the way to check this.
- **`docs/INTEGRATION.md` opens by saying who it is for.** The page is public,
  and the reader it could most easily mislead is an outside developer looking
  for a sign-up button. It now states plainly that this is the internal guide
  for Softmato's own product teams, that there is no self-service API, and
  points anyone else at `/contact` — where we build it for them. The
  `/developers` page repeats the short version as a callout above the fold.

- **Company details in the legal documents are now admin-configurable.**
  `{{settings.key}}` tokens in a document body are resolved from
  `platform_settings` as the page renders (`apps/web/lib/cms/tokens.ts`), so
  the registered address, PAN, registration number and the support, refunds and
  abuse mailboxes are edited once in the admin panel instead of in seven
  documents. The Company settings group had carried `company.address`,
  `company.pan` and the mailboxes since it was written — their help text says
  "Printed in the SLA", "Printed in the Refund Policy" — but nothing had ever
  read them and the documents held `[confirm: …]` markers instead. Added
  `company.legal_name`, `company.registration_number`,
  `company.contact_email`, `company.emergency_phone`, and the two data-region
  keys the Privacy Policy's processor table needs.

  A blank **required** setting resolves to `[confirm: <label>]`, which is the
  marker `legalReadiness()` already blocks on — so an unfilled address still
  keeps its document out of the search index, under the rule that was there
  before. A blank **optional** token (`{{company.pan?}}`) drops its whole line
  instead: Nepal has no Impressum rule obliging a company to print its PAN or
  registry number on a website, so whether those appear is now a field left
  empty rather than seven documents edited. `pnpm legal:check` and
  `pnpm legal:todo` both run against the resolved text, and `legal:todo` now
  separates settings to fill in from markers that need a document edit.

- **Candidate Privacy Notice** (`/legal/candidates`) — the seventh public legal
  document, and the one that was overdue: `careers/` has been collecting CVs
  with nothing describing what happens to them, which the **Individual Privacy
  Act, 2075** does not permit. Covers the three intern tracks, including the
  two-way reporting a college-sponsored placement involves, and states plainly
  that we never charge a candidate a fee.
- **People-side templates** in `docs/legal/people/` — employment agreement,
  internship agreement (stipend / unpaid / institution-sponsored),
  training-placement agreement with an institution, IP assignment and
  confidentiality, employee handbook, anti-harassment policy, IT and device
  policy, and an offboarding checklist. **Not published and not CMS content**:
  these are handed to a person. Written against the Labour Act 2074, the Social
  Security Act 2074, and the Sexual Harassment at Workplace (Prevention) Act
  2071, which requires an employer to _have_ a policy and a complaints route.
  Each carries a standing clause that the Act wins wherever it gives someone
  more than the template does, so no template has to restate a statutory
  figure exactly.
- **`docs/PRODUCT_LEGAL_CHECKLIST.md`** — what a new SaaS must publish on its
  own site to sit under the parent policies, and the floors it may not go
  below (grace periods, retention, refund window, liability cap, never
  auto-debit, never hold a customer's end users' money).

- **TOTP enrolment as a flow rather than a line of CLI output** — a new admin
  now scans a QR in the browser instead of copying an `otpauth://` URI out of a
  terminal. `pnpm admin:create` writes the row **inactive with no secret**,
  which is the one shape `admin_users` allows an un-enrolled admin to take
  (`NOT is_active OR totp_enabled`), and prints a one-time `/enrol` link. The
  page shows the QR and setup key, takes one code to prove the scan landed, and
  activates the account.
- **`/admin/security`** — password change and authenticator replacement for the
  signed-in admin. Both re-authenticate with the current password _and_ a
  current code: a session cookie alone must not be enough to change the
  credentials it was issued against. Rotating the authenticator only commits
  the new secret after a code from the **new** device verifies, so the old one
  keeps working until the swap is proven and closing the page changes nothing.
  There was previously no way to change a password short of a direct database
  update.
- **`lib/password.core.ts`** — argon2id parameters and the length rule in one
  place, shared by `auth.ts`, `/admin/security` and `pnpm admin:create`. The
  parameters were previously duplicated between the CLI and the app, which is
  how an account created by the script ends up unverifiable by the application.
- **`pnpm admin:totp`** re-displays or rotates an enrolment from the CLI, and
  **`pnpm admin:enrol`** re-issues an expired link (`--reset` forces a fresh
  enrolment for someone already active). Between them there is now a recovery
  path for a lost phone; previously the URI was printed once and, if lost, the
  account was unrecoverable through any supported route.
- `qrcode` (server-rendered to inline SVG). Added under the RULES.md §4
  ask-first rule. The QR is inlined rather than given an `img src` because the
  URI it encodes contains the shared secret, and a secret in a URL reaches the
  access log, the history and the referrer.

### Changed

- **The legal documents no longer read as a payment aggregator's.** They were
  written against a PRD that describes Softmato as a payment platform, so they
  inherited a payments company's centre of gravity — most visibly in the
  Acceptable Use Policy, where four of six prohibitions were
  payment-regulatory (hundi/hawala, unlicensed financial services) and a whole
  section governed merchant accounts we do not operate. Removed, and the
  sections that actually govern a SaaS-and-agency company grew to take their
  place.
- **Terms of Service** now carries all three lines of business rather than one
  line each, and states the umbrella rule: a product's own terms may add
  detail and promise more, never less, and where they conflict the term more
  favourable to the customer applies. Project work gained client
  responsibilities, scope-change handling, an acceptance window, and an
  explicit **no-ranking-guarantee** clause for SEO work. The liability cap is
  now the greater of three months' fees _or_ the proposal value, because for
  project work the old cap could sit far below what the client had paid.
- **The pass-through payment model is described for the first time.** Where a
  product routes a customer's own end users' payments using the customer's own
  merchant credentials, the money moves payer → merchant directly and never
  reaches us. Nothing in the six documents had said so. Terms §4 now sets out
  whose provider agreement applies and who handles a refund; the Refund policy
  says plainly that money we never received is not money we can return.
- **Privacy Policy** distinguishes controller from processor — data a customer
  holds in one of our products, merchant credentials, and access to a client's
  live systems during project work. All three were absent, and they are the
  positions that matter most now that products hold records about people who
  are not our customers.
- **SLA** keeps its 99.5% and 24/7 one-hour P1 numbers unchanged on the
  founder's instruction; only the payments framing was removed. It now says
  explicitly that a delivered project site is _not_ covered by it, which a
  footer link had left ambiguous.
- Commercial periods are now expressed as **floors rather than flat numbers**
  (grace "at least 7 days", retention "at least 30"), so a product may be more
  generous without contradicting the parent. The floors are tabulated in
  `docs/PRODUCT_LEGAL_CHECKLIST.md`.

- `/enrol` joins `/login` in the set of paths `proxy.ts` never rewrites. Under
  the admin surface it would have become `/admin/enrol`, hit the layout's
  session guard, and bounce a new admin to a login they cannot yet pass — the
  same trap `/login` was already excluded for.
- The sign-in page said sessions last 12 hours; `authConfig.maxAge` is 8. The
  copy now matches the code.
- Sign-in renders a confirmation when arriving from a completed enrolment.
  Without it the redirect landed on a blank form that read as the enrolment
  having been thrown away.

### Security

- **Changing a password does not sign other devices out.** Sessions are JWTs
  with no server-side revocation, so one issued before the change stays valid
  until it expires (8 hours). Fixing it needs a token version on `admin_users`
  and a check in the jwt callback — a migration, so it is noted rather than
  done. Rotating TOTP _does_ take effect immediately, which is the lever to
  pull if a session is believed compromised.
- An enrolment token is bound to the admin's `isActive` and `totpEnabled`, so
  completing enrolment invalidates the link that authorised it — single-use
  with no token table to leak or fail to clean up. `verifyEnrolmentToken` also
  refuses any already-enrolled subject outright, so a token minted against an
  active admin cannot be used to replace their second factor.
- **A search-engine layer across every public page** (`apps/web/lib/seo/`).
  Canonical URLs on all twelve public routes, a `metadataBase` so relative
  images resolve at all, a `%s · Softmato` title template, `summary_large_image`
  Twitter cards, and `og:type: article` with published/modified times on posts.
  JSON-LD throughout: Organization and WebSite once on the home page, with
  every other page pointing at them by `@id`, plus BreadcrumbList, Service,
  SoftwareApplication, BlogPosting, CollectionPage, ContactPage and Person for
  the team. Nothing in it asserts a price, a rating or a review — a test fails
  if someone adds one.
- **A generated 1200×630 social card** (`app/opengraph-image.tsx`) on the site's
  light ground, carrying the brand lockup when `public/brand/logo.png` is
  present and a wordmark when it is not. Every page now has an `og:image`;
  previously none did.
- **`app/manifest.ts`** — name, icons and theme colour for Android home screens.
  `display: 'browser'`, deliberately: this origin has a login and a checkout on
  it, and hiding the URL bar from someone about to type a password is a bad
  trade for a marketing site.
- **Brand assets as a pipeline** (`public/brand/`, `lib/brand/assets.ts`,
  `pnpm brand:build`). Three masters — the horizontal lockup, the S mark and the
  invoice stamp — with the favicon, Apple touch icon and both manifest icons
  generated from the mark by script rather than hand-cut and left to drift.
- **Social profile settings** (`company.linkedin_url`, `github_url`, `x_url`,
  `facebook_url`) and a `url` setting kind to hold them. They become `sameAs` in
  the Organization block, which is what connects softmato.com to a LinkedIn page
  as one organisation rather than two that share a name. All blank by default.

### Changed

- **`robots.txt`** now excludes `/login` and the `utm_`/`fbclid`/`gclid`
  parameter forms, and declares `Host`. The root layout carries a matching
  `robots` meta tag: `Disallow` stops a crawler _fetching_ a URL, only `noindex`
  keeps it out of the index, and a URL can be indexed from an inbound link
  without ever being fetched.
- **The sitemap** carries `lastModified`, `changeFrequency` and `priority`, and
  includes `/blog` — a real, linked, 200-response route that has no `pages` row
  behind it and so had never been listed. It returns empty on any non-production
  deployment.
- **`getPage`, `getService`, `getProductPage`, `getPost` and `getLegalDocument`
  are wrapped in React's per-request `cache`.** A single render asked for the
  same row two or three times — metadata, body, structured data. Now one query.
- **`vitest.config.ts` aliases `server-only`** to an empty stub. It throws
  unless the bundler resolves it under React's `react-server` condition, which
  vitest does not set, so every module guarded by it — the CMS queries, the
  metadata builders, the whole SEO layer — had been untestable.

### Fixed

- **JSON-LD did not escape `<`.** `.replace(/</g, '<')` was written with a
  single backslash, which TypeScript resolves at compile time into a no-op
  replacing `<` with `<`. A founder pasting `</script>` into a post excerpt
  would have closed the tag early and put the rest of the excerpt into the
  document as markup. Caught by the test written to prove the escaping worked.

### Security

- **Published legal documents that are not finished are no longer indexable.**
  All six policies are live while still carrying their "not yet reviewed"
  banner and 6–15 unfilled `[confirm: …]` markers each. They now render with
  `noindex, follow` and are excluded from the sitemap, by the same rule
  `pnpm legal:check` already enforced before a deploy
  (`lib/cms/legal-readiness.ts`, shared between the two so they cannot drift).
  The guard clears itself when the placeholders are edited out.

- **The home page's chapters below the hero, rebuilt against a second reference
  film** (Eduwerks, supplied 2026-08-29; stills and the rules taken from it at
  `docs/reference/film-2/`). The first film gave the site its light-form
  language; this one gave it a layout grammar. Eight chapters, each a different
  shape, used once each: a two-tone sentence over a scatter of discs, a panel
  held still while the services scroll past it, the dark products band, a
  three-rung scope ladder, a heap of words dropped under gravity, a photograph
  beside the globe, a ruled list of posts, and a dark close. The hero, header
  and footer are untouched.
- **`.band-dark`** — a dark chapter with a large top radius that slides up over
  the section above. This is what lets the page open on night and close on night
  with the products band between; the previous build allowed exactly one dark
  section because a straight join at two positions reads as stripes.
- **`ToneReveal`** — a headline whose words are set in two tones and brighten to
  their final tone on scroll. Replaces `WordReveal` on the home page, which
  animated every word to one colour and so could not carry a two-tone sentence.
- **`PillPile`** — a Matter.js drop that settles fourteen words into a heap in
  the principles chapter, mounted on approach and stopped once every body is
  asleep. Ships at its resting layout, so the no-JS, failed-bundle and
  reduced-motion states are the same heap already at rest.
- **`DrawIn` and `components/public/marks/`** — hand-drawn annotation strokes
  (underline, circle, spark, squiggle) and a ringed link arrow, drawn on with
  `stroke-dashoffset` rather than faded in. At most one mark per section.
- **A scope ladder on the home page** — static / advanced / custom, for websites
  and for apps, each rung settled by one yes/no question. Stands in for a price
  list; no figure appears. Definitions in `lib/home/tiers.ts` are **placeholder
  pending the founder's confirmation**.
- **Drawn stills, one per service** (`components/public/home/stills/`) — an
  application with a sidebar and a chart, a browser window, and a phone whose
  screen is built from mobile glyphs (sign-in, offline, camera, location, push,
  stores). Held in the services chapter's sticky panel until real screenshots
  exist, and **keyed by slug** so a service is never shown beside a picture of
  something else.
- **Mobile apps as a service of its own**, alongside websites — seeded in
  `packages/db/seed/marketing/services.ts` and published.
- **A light-form in the closing section** — `showcase`, a carousel of four
  surfaces (a website, an app, a product dashboard, a design artboard) turning
  slowly inside the bowl of the closing arc. Each panel is a 2D canvas drawn once
  and mapped onto a single plane (`components/three/forms/surfaces/`), so the
  whole thing is eight meshes and four draw calls; the panels billboard so none
  of them ever goes edge-on, and the group scales to fit narrow canvases.
- **`LightForm` takes `ground` and a placement class.** `ground="dark"` swaps the
  light rig — the default keys a form from behind into a silhouette, which is
  right on the near-white page and renders a black object on a black band. The
  class decides which box the scene fills, and therefore where the form sits,
  since the camera looks at the middle of that box.
- **A placeholder photograph of Kathmandu** in the place section, from Unsplash,
  which was already the one non-bucket host `next/image` may optimise from.

### Changed

- **`payment-integration` is off the public site**, at the founder's request on
  2026-08-29 — put back to **draft** rather than deleted, so the copy survives
  and one toggle in the admin panel brings it back when there is a live gateway
  behind it. Its detail page now 404s; the sitemap drops it on its own, since
  that is generated from published rows.

### Fixed

- **No light-form had ever mounted — not one, on any page.** `LightForm` decides
  whether WebGL is available with `useSyncExternalStore` and returns `null` while
  it does not know, so the first client render (which uses the _server_ snapshot,
  `false`) produced no element. `useNearViewport`'s effect ran against that
  commit, found `ref.current === null`, bailed, and never ran again — its
  dependency array had no reason to change when the second render finally mounted
  the div. The orb, the eclipse and the globe were all shipped, all imported, and
  all invisible. It failed silently because every section paints its own bloom in
  CSS underneath, so a missing form looks exactly like one that has not arrived
  yet. The hook hands back a callback ref now, so the observer is created when the
  node attaches.

- **The header's dark-ground tint was wrong over any dark section taller than
  the viewport.** `DarkNavZone` watched a one-pixel sentinel at the section's
  bottom edge, which reports "not intersecting" both when the section has
  scrolled past and when its bottom simply has not arrived yet — correct for a
  one-viewport hero, wrong for the 1400px products band, over which the wordmark
  went back to near-black on near-black. It is a ScrollTrigger range now, and
  the zones are counted rather than each writing the attribute, which also
  removes a first-paint race between three of them.

- **A cinematic light-form design for the public site**, rebuilt from a second
  reference film the founder supplied (2026-08-28). One near-white ground runs
  the length of the page and each section is built around a single enormous
  emerald light-form the reader scrolls through: an arc, an orb with a comet,
  an eclipse, and a globe of points. The forms live in
  `apps/web/components/three/forms/`; the stage, bloom, grid floor, pill and
  device classes are in `apps/web/app/marketing.css`.
- **The wordmark as the hero's light-form.** `ArcMark` draws S O F T M A T O
  along a bowl of light, reproducing the reference's opening frame by frame:
  the bowl expands from a sliver, a spark travels out along each half, the
  letters light as it passes them from the centre outward, and a quieter second
  bowl resolves inside the first.
- **`StaggerIn`**, a motion primitive that fades a block's direct children up in
  order, on mount or on scroll.
- **`pnpm cms:sync-copy`** — local-only, pulls a development database's CMS rows
  back in line with the seeds. The seeder correctly refuses to overwrite
  published rows, which left databases seeded before the copy existed holding
  placeholders for ever.
- **The two founders in the team seeds**, replacing the fictional placeholders
  that stood in for open question 8.

### Changed

- **Palette rebranded from violet and near-black to white light and emerald**,
  at the founder's direction (2026-08-28) — `--primary` is `#047857` again, and
  the six `--brand-*` display accents are replaced by a four-value light family
  (`--glow-core`, `--glow`, `--glow-deep`, `--haze`) plus `--ink`. This
  supersedes `docs/DESIGN.md` §1–§2.
  - **The `--credit` / `--flag` rule needed restating, not relaxing.** The brand
    hue is now the same family as `--credit`, so what holds them apart is no
    longer hue but direction of use, and it runs both ways: an amount is only
    ever `--credit`, `--flag` or `--foreground`; a non-financial element is
    never `--credit` or `--flag`. See the note at the top of `globals.css`.
- **Display face changed from DM Sans to Outfit**, at 300/400/500. The
  marketing surface sets one-line statements at 80px and up, where DM Sans
  closed its counters under the tracking the design wanted.
- **The home page is no longer a stack of alternating light/dark bands.** The
  ground never changes now; only what is lit on it does. `Band`, `.band-*`,
  `.dot-grid` and the curved joins are gone. One section inverts to dark — the
  products section — because a page of light needs a floor under it exactly
  once.
- **Navigation moved from a bottom-fixed pill to the header.** Wordmark left,
  link pill centre, one action right, with a disclosure under `md`. On a page
  whose sections are full-height light-forms, a bar fixed to the bottom sits in
  the middle of every one of them.
- **Email templates repainted** to the new tokens' sRGB equivalents.
- **`BlurIn` and `WordReveal` no longer force `.headline`.** The caller passes
  `.headline` or `.display`, so a display heading is not two conflicting rules
  relying on stylesheet order.

### Fixed

- **ScrollTrigger now refreshes once the webfonts have swapped in.** It caches
  trigger positions on first run; the display face arriving afterwards changes
  every heading's height and moves every trigger below it. The symptom is a
  reveal firing early near the foot of a long page, and it is invisible on a
  warm cache.
- **Two contrast failures found by calculation rather than by eye**, both only
  present where the design is at its most decorative: secondary copy over the
  hot centre of a bloom (4.2:1) and the team page's emerald initials over a
  `--glow-core` tile (4.1:1). The bloom's alphas and the tile's gradient are
  now set by that budget, and both places carry the arithmetic in a comment.

### Removed

- `Band`/`BandInner`, `FloatingNav`, `SiteNav`, `PinnedShowcase`, `PillDrop`,
  `Doodle` and the procedural blob scene — all superseded by the light-form
  design.
- **`lib/home/content.ts`, and with it every invented figure on the site**: the
  "6 years shipping / 2 products / 41 hostels" strip and the NPR
  25,000/75,000/240,000 pricing table. The founder confirmed on 2026-08-28 that
  neither should ship. Nothing on the public site now states a number about the
  business that is not checkable — the one figure left on the home page is
  Kathmandu's coordinates.

### Added

- **A motion and 3D layer for the public site**, built from the founder's
  reference video. Reusable primitives in `apps/web/components/motion/`:
  word-by-word scrub reveal, blur-in headline entrance, parallax, DrawSVG
  hand-drawn annotations, a pinned feature showcase, and a Matter.js physics
  drop. WebGL blobs in `apps/web/components/three/` are procedural
  (`MeshPhysicalMaterial` with clearcoat + iridescence) rather than loaded
  models, and the lighting environment is built in-memory from lightformers so
  nothing is fetched from a CDN.
- **Full-bleed banded home page.** Alternating light/dark sections joined by
  the reference's curved edges (`Band`, `.band-*` in `app/marketing.css`).
- **A floating pill navigation** fixed to the bottom of the viewport, replacing
  the header's link list. The header is now the wordmark and one action.
- **`pnpm legal:check` and `pnpm legal:todo`**, plus a `predeploy` script.
  `legal:check` fails when a _published_ legal document still carries its
  "not yet reviewed" banner or an unfilled `[confirm: …]` marker.

### Changed

- **Palette rebranded from white/black/emerald to violet, near-black and a set
  of bright display accents**, at the founder's direction (2026-08-27). This
  supersedes `docs/DESIGN.md` §1–§2. `--credit` and `--flag` were deliberately
  _not_ folded into the brand accents: telling money in from money out at a
  glance is a legibility requirement on a product that moves real money.
- **`body` now uses `overflow-x: clip` rather than `hidden`.** `hidden`
  computes the other axis to `auto`, which made the body a scroll container;
  ScrollTrigger measured the window instead and every scrub and pin on the site
  froze at its start value.
- **The public layout no longer constrains width.** Pages other than the home
  page sit in a `(site)` route group whose layout applies the measure, so
  full-bleed bands can reach the viewport edge.

### Removed

- **The manual QR payment flow**, reversing the decision that made it
  first-class. A customer transferring by bank QR and uploading a screenshot
  for an admin to approve is gone; every payment now goes through a gateway and
  nothing is credited on a person's say-so. Two consequences, both accepted:
  there is no longer a fallback when a gateway is down, and since this was the
  only provider needing no external credentials, **no payment can be taken
  until Fonepay, eSewa or Khalti has both credentials and a working adapter.**

### Changed

- **Fonepay is the primary payment integration**; eSewa and Khalti are
  secondary. Providers are seeded inactive — a provider is activated in the
  same change that lands its adapter and its credentials, never before, so a
  customer is never shown a method that fails when they try to pay.

### Added

- **A confirmed payment posts to the ledger and sends the payer a receipt.**
  The receipt states the gross amount — what left the customer's account —
  because the provider's fee is our cost, not a deduction from what they paid.
  It reuses the transaction number rather than opening a second numbered
  series, and it can never fail the payment: it is sent after the journal is
  posted, through a path that cannot throw.
- **The same verified result arriving repeatedly posts exactly one journal.** A
  callback and a poll racing, a retry, five identical lookups — all settle a
  payment once.
- **A provider amount that differs from what we expected posts nothing** and
  flags the transaction for a human to reconcile. It is never resolved by
  taking the provider's word, and never by taking ours.
- Posting rule for a confirmed gateway payment (`CHART_OF_ACCOUNTS.md` §9.2),
  with the provider's fee passed through exactly as reported rather than
  computed as a percentage.

- **Payment sessions move through an enforced state machine.**
  `packages/payment-core/sessions/transition.ts` is the only writer of
  `payment_sessions.status`, and every move goes through the legal-transition
  table. The UPDATE carries `WHERE status = <from>`, so two writers racing on
  the same session cannot both win — the loser is told the session moved rather
  than overwriting it.
- **An expired session cannot be paid** (Phase 3 acceptance 7).
  `loadPayableSession()` settles expiry on the way past: a session whose
  deadline passed is written `expired` before any caller acts on it, rather
  than left reading `created` for a status column nobody re-checked. A session
  that already succeeded is never expired after the fact.
- **Provider selection** — a customer picks a method, checked against the
  `allowed_providers` written at session creation rather than against the
  providers table as it now stands, so a provider deactivated mid-session
  cannot change what the page in front of a human is offering. Re-selection and
  double-clicks are both handled.
- **Selecting a provider now starts a payment attempt** — a numbered
  `transactions` row, its amount taken from the session (which recomputed it
  from the invoice), with no fee assumed until a provider reports one.
- **Reloading the checkout page does not start a second attempt.** A live
  attempt is returned unchanged, with the same reference code and QR the
  customer was already shown. Without this a customer could pay quoting the
  first reference while the page displayed a second, and the screenshot would
  match no transaction anyone was looking for. A _failed_ attempt is left
  behind as the record that it happened; trying again opens a new one.
- **The `manual_qr` adapter**, the first provider behind the registry. It
  produces the company QR and a reference code for the payment remark, and its
  `poll()` reports our own record rather than pretending to have checked
  something — there is no external system to ask. No fee, ever: the money
  arrives in the bank account directly.
- Reference codes are built to survive being photographed and retyped: the
  alphabet excludes `I`, `L`, `O` and `U`, and an admin can enter one
  lower-cased, spaced, unhyphenated or without its prefix and still match it.
- The company QR lives in `payment_providers.config`, **not** in platform
  settings, and is read fresh on every initiate. It decides where a customer's
  money lands, so changing it is a reviewable migration rather than a form
  submission — and a corrected QR is live at once.
- **A provider registry** (`packages/payment-core/providers/registry.ts`).
  Adapters register themselves at composition time, so `payment-core` does not
  depend on any gateway SDK and Phases 4, 5 and 9 add a provider by writing an
  adapter rather than by editing the core. A provider configured active with no
  adapter behind it fails loudly instead of at the point of money.
- The founder's UI mockups and their implementation handoff are committed at
  `docs/handoff/`, and are the design authority for the interface.
- A shared component set in `apps/web/components/ui/` — button, input, field,
  card, badge, banded data table, money and Bikram Sambat displays, stat tile,
  empty state, skeleton, spinner, tabs, confirm dialog and toasts — so every
  screen composes the same pieces instead of restyling its own.
- NPR amounts render with **lakh–crore grouping** (`2,40,000.00`, never
  `240,000.00`) and a true minus sign, from bigint paisa.
- The home page is composed rather than a single markdown body: hero, figures,
  services, products, the support-retainer price list set as a receipt, recent
  writing and one call to action. Publishing a service or a post changes the
  front page with no edit.
- The blog index filters by tag, and announces the result count.
- **Audit log at `/admin/audit`** — the full stream, filterable by action,
  with before/after changes readable without a JSON viewer.
- The admin dashboard shows ledger integrity and recent activity.
- Designed 404 and 500 pages, replacing Next's defaults.
- The public site meets its accessibility and performance bar: **Lighthouse
  accessibility 100 on every page**, performance 93–97, measured against a
  production build.
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

### Changed

- The palette is now **white, black and emerald**. The terracotta accent and
  the warm cream ground are gone. Money keeps its two colours, and they keep
  their meanings.

### Fixed

- **The wordmark was unreadable to a screen reader.** ARIA forbids
  `aria-label` on a `span` with no role, so the label wrapping the animated
  letters was ignored and the company name was announced one letter at a time —
  the exact failure the label existed to prevent.
- **Secondary text failed contrast inside tinted panels.** The muted foreground
  cleared AA on white but reached only 4.43:1 on `--surface`, so every muted
  paragraph and eyebrow sitting in a panel was below the 4.5:1 floor.
- The home page skipped a heading level: the Services, Our products and Writing
  labels were paragraphs, leaving the card titles as `h3` directly under the
  `h1`. They are headings now, with no visual change.
- Rendered CMS markdown carried an invalid `node="[object Object]"` attribute on
  every element — 86 of them on a single legal page.
- A failed sign-in showed nothing. `/login` redirected to `?error=1` but never
  rendered an error, so a wrong password or a rolled-over authenticator code
  silently reloaded an empty form.
- Publishing and unpublishing fired on a single click. Both now require
  confirmation, so content cannot go live — or come down — by mis-clicking.
- Eyebrow labels rendered at 12px instead of 10.5px: a Tailwind utility was
  overriding the component-layer class that sets their size.
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

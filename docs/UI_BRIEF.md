# UI Brief — Softmato Platform

**Hand this whole file to the UI assistant.** It describes the product, the
palette, every page that will exist, and the data each page has to work with.
Field names below are the real column names from the database, so a design that
uses them can be wired up without translation.

---

## 0. How to use this brief

- Design **the components first**, then the pages. Nearly every page is a
  composition of the same twenty or so pieces (§4).
- Where a page says _Phase N_, it does not exist yet. Design it anyway if you
  are doing a full system — but the Phase 2 pages are what ship first.
- Do not invent data. If a screen needs a field that is not listed, say so
  rather than designing a card around a number nobody stores.
- Every list has an empty state, every form has an error state, every async
  action has a pending state. A design without those three is half a design.

---

## 1. What this product is

**Softmato Technology Pvt Ltd** is a software company in Kathmandu, Nepal. It
does two things: it builds and runs its own SaaS products (HostelHub,
QuestionCall), and it takes on project work for other companies.

The platform being designed is one Next.js application serving **four
surfaces**, split by subdomain:

| Surface       | Domain                 | Audience              | Feel                                     |
| ------------- | ---------------------- | --------------------- | ---------------------------------------- |
| Public site   | `softmato.com`         | Prospects, candidates | Marketing. Warm, confident, uncluttered. |
| Admin panel   | `admin.softmato.com`   | The founders only     | Dense, fast, information-first.          |
| Checkout      | `payment.softmato.com` | Customers paying      | Calm, obvious, zero decoration.          |
| Client portal | `agency.softmato.com`  | Agency clients        | Reassuring, simple, few choices.         |

**The money matters.** This platform keeps double-entry books. Payments run
through Nepali providers — eSewa, Khalti, Fonepay, and bank QR with a
screenshot as proof. Amounts are in Nepalese Rupees, stored in paisa. Dates are
shown in Bikram Sambat with the Gregorian date beside them.

The tone across all four surfaces: **a well-kept account book.** Precise,
legible, unhurried. Nothing bounces. Nothing shouts.

---

## 2. Palette — soil ⚠ SUPERSEDED

> **This section is history, not instruction.** The soil palette below was the
> brief handed to the UI assistant. It has been superseded three times since:
> narrowed to white/black/emerald, then replaced with violet and near-black
> (2026-08-27), then replaced again with **white light and emerald**
> (2026-08-28) after a second reference film.
>
> **`apps/web/app/globals.css` is the only current authority on the palette.**
> Not this section, not `docs/DESIGN.md` §2, and not
> `docs/handoff/UI_HANDOFF.md` §1 — all three are records of decisions that
> were later reversed. Nothing below this line describes what is built; the
> page inventory from §3 onward still does, except where §3.1's home page
> "wants" list describes the banded layout that the light-form design replaced.

The direction is **soil**: sun-warmed earth and what grows out of it. Warm
orange-browns as the ground, green as the living accent, ochre for attention.
Not tropical, not neon — the colours of dry clay, terracotta, moss and turmeric.

Define these as CSS custom properties in `apps/web/app/globals.css` and expose
them to Tailwind v4 through `@theme inline`. **One definition, no copies.**

### Light (default — public, checkout, portal)

| Token                | Value     | Role                                          |
| -------------------- | --------- | --------------------------------------------- |
| `--background`       | `#FBF7F1` | Page ground. Dry clay, never pure white.      |
| `--surface`          | `#FFFCF8` | Raised card on the ground                     |
| `--surface-strong`   | `#F4EBDF` | Sifted soil. Panels, table bands, code blocks |
| `--foreground`       | `#241C16` | Body text. Wet earth, not black.              |
| `--muted-foreground` | `#7A6A5C` | Secondary text, labels, captions              |
| `--border`           | `#E6DACB` | Hairlines. Always visible, never heavy.       |
| `--primary`          | `#2F6B43` | Green. Primary action, links, active state.   |
| `--primary-hover`    | `#255636` | Pressed and hovered primary                   |
| `--accent`           | `#C4551F` | Terracotta. Emphasis, highlights, one CTA.    |
| `--ochre`            | `#D89B3A` | Attention, warnings, "needs a look"           |
| `--credit`           | `#1F7A4D` | **Money in.** Green, deeper than primary.     |
| `--flag`             | `#B3341C` | **Money out, reversed, overdue.** Rust.       |
| `--destructive`      | `#A32E1C` | Destructive actions: delete, revoke           |
| `--ring`             | `#2F6B43` | Focus ring, at 45% opacity, 2px offset        |

### Dark (admin only — turned soil at night)

| Token                | Value     |
| -------------------- | --------- |
| `--background`       | `#16120F` |
| `--surface`          | `#1E1915` |
| `--surface-strong`   | `#251E19` |
| `--foreground`       | `#F2E9DE` |
| `--muted-foreground` | `#A89686` |
| `--border`           | `#2F2620` |
| `--primary`          | `#4E9E68` |
| `--accent`           | `#E1763C` |
| `--ochre`            | `#E0AC55` |
| `--credit`           | `#58B57C` |
| `--flag`             | `#E06A4E` |

### Rules that are not negotiable

1. **Colour carries meaning in the money paths.** `--credit` means money in,
   `--flag` means money out or reversed. Never use either for decoration, and
   never set an amount in `--accent`.
2. `--destructive` is for destructive **actions**. `--flag` is for **figures**.
   Different tokens on purpose.
3. Body text must reach **7:1** contrast against its background where it can,
   and never fall below **4.5:1**. Large text and UI edges: 3:1 minimum.
4. **One terracotta call-to-action per screen.** If everything is accented,
   nothing is.
5. Depth comes from long, low-opacity shadows and hairline borders — not from
   heavy strokes or bright fills.

### Typography

| Role       | Face                     | Use                                            |
| ---------- | ------------------------ | ---------------------------------------------- |
| Display    | **DM Sans**              | Headings, page titles. Tight tracking, -0.03em |
| Body       | **Inter**                | All running text, labels, buttons              |
| Data       | **IBM Plex Mono**        | Every number, ID, code, amount, date           |
| Devanagari | **Noto Sans Devanagari** | Nepali text fallback                           |

**Every number is set in tabular mono** — `font-variant-numeric: tabular-nums`.
Amounts, transaction IDs, invoice numbers, account codes, dates. Digits must
align vertically in a column so a mis-keyed figure is visible at a glance. This
is a legibility requirement, not a preference.

### Motion

Short and few. 150–200ms, ease-out, on opacity and small transforms only.
Nothing slides in on scroll. Everything respects `prefers-reduced-motion` by
falling back to no transition at all.

---

## 3. Page inventory

### 3.1 Public site — `softmato.com`

All content comes from the CMS and is editable by a founder. **Every field
below is real**; where a field is optional, the design must survive it being
empty.

#### Home — `/`

_Data:_ `title`, `body` (markdown), `metaTitle`, `metaDescription`.

Everything else on this page is composed by the designer from other CMS
sources. What is available to pull in: the three services (title, summary,
icon), the two product pages (title, tagline, logoUrl), and the most recent
blog posts (title, excerpt, publishedAt).

_Wants:_ a hero that states plainly what the company does; a services strip; a
products strip; a short "how we work" section; one contact CTA. No carousel,
no autoplaying anything, no fake logos-of-clients bar.

#### About — `/about`

_Data:_ `title`, `body` (long markdown, headed sections), SEO fields.

_Wants:_ readable long-form column, generous measure (65–75 characters),
section headings that survive being reordered by an editor.

#### Services index — `/services`

_Data per service:_ `slug`, `title`, `summary`, `icon` (icon **name**, not a
URL), `sortOrder`.

_Wants:_ a grid of three; each card links to its detail page. Icon is a small
glyph, not an illustration.

#### Service detail — `/services/[slug]`

_Data:_ `title`, `summary`, `body` (markdown with `##` sections and lists),
`icon`, SEO fields.

#### Products index — `/products`

_Data per product page:_ `slug`, `title`, `tagline`, `logoUrl`, `sortOrder`.

#### Product detail — `/products/[slug]`

_Data:_ `title`, `tagline`, `body` (markdown), `logoUrl`, `screenshotUrl`,
`siteUrl` (external link, may be null), SEO fields.

_Wants:_ the screenshot is contained in a fixed 16:9 frame, never cropped — it
is a screenshot, and cut edges make it useless. Logo may be missing.

#### Team — `/team`

_Data per member:_ `name`, `role`, `bio` (may be null), `photoUrl` (**often
null — design the no-photo state first**), `email`, `linkedinUrl`,
`githubUrl`, `sortOrder`, `isActive`.

_Wants:_ a grid that looks right with two people and with ten. Photos are
80px circles. A member with no photo gets initials in a soil-toned tile, not a
grey silhouette.

#### Careers — `/careers`

_Data:_ `title`, `body` (markdown). There is **no roles table** — open roles
are written into the body today.

_Wants:_ design for "nothing open right now" as the normal case, with a way to
write in anyway.

#### Blog index — `/blog`

_Data per post:_ `slug`, `title`, `excerpt`, `coverImageUrl` (may be null),
`tags` (string array), `publishedAt`, `authorId`.

_Wants:_ dates in Bikram Sambat with the Gregorian date beside them. Tags are
filter chips, not decoration.

#### Blog post — `/blog/[slug]`

_Data:_ all of the above plus `body` (long markdown: headings, lists, tables,
code, blockquotes — all must be styled).

_Wants:_ cover image in a fixed 16:9 frame; a reading column; tags at the foot.

#### Contact — `/contact`

_Data:_ page `title` and `body`, plus the form. Form fields: `name*`,
`email*`, `phone`, `subject`, `message*`, and a **honeypot field named
`website` that must be invisible to people and reachable by bots** — off-screen
positioning, never `display:none`, never `tabindex`-reachable.

_States to design:_ idle, per-field validation error, submitting, success
("Thanks — we will be in touch"), and rate-limited ("That is a few messages in
a short time").

_Wants:_ the company's contact details beside the form — address, phone,
email — all of which come from platform settings.

#### Legal document — `/legal/[slug]`

Six documents: `terms`, `privacy`, `refunds`, `sla`, `aup`, `cookies`.

_Data:_ `title`, `version` (integer), `effectiveAt` (date), `body` (long
markdown with numbered `##` sections and tables).

_Wants:_ version and effective date visible at the top; an "on this page"
index built from the `##` headings; links to the other five policies at the
foot. These are read by someone hunting one clause — make that fast.

#### Also needed

- **Site header** — logo, seven nav links, mobile menu. Sticky, quiet.
- **Site footer** — the seven legal links, contact block, copyright.
- **404 and 500** — currently Next's defaults, which look nothing like the
  site. These need designing.

---

### 3.2 Admin panel — `admin.softmato.com`

Founders only, behind email + password + a mandatory authenticator code. Dense
by design: this is a tool, not a brochure. Assume a desktop, but nothing may be
unusable on a phone — a payment gets approved from wherever the founder is.

#### Sign-in — `/login`

Two steps: credentials, then a 6-digit TOTP code. Design the code input as six
separate boxes with paste support. States: wrong password, wrong code, locked
out.

#### Dashboard — `/admin`

_Data available:_ whether the ledger balances (a yes/no from
`v_unbalanced_journals`), revenue this month, payments awaiting approval,
overdue invoices, recent audit entries.

_Wants:_ the top row answers "is anything wrong?" before it answers "how are we
doing?". A red state here means something needs a human today.

#### Content — `/admin/cms`, `/admin/cms/[kind]`, `/admin/cms/[kind]/[id]`

Six content kinds: pages, blog posts, services, products, team, legal.

_List view data:_ title, status (`draft` | `published`), updated date.
_Editor data:_ the fields of that kind (see §3.1), a publish/unpublish panel,
and a status badge.

_Field types to design once:_ text, textarea, markdown (with preview), slug,
tags, image (upload **or** paste a URL), sort order, SEO block.

_Wants:_ draft versus published must be unmistakable at a glance. Publishing is
a deliberate, confirmed action — a founder must never publish by mis-clicking.

#### Settings — `/admin/settings`

_Data:_ four groups — Billing, Support, Website, Company. Each setting has a
label, help text, a value, a unit (`days`, `%`, `per hour`), and a marker for
whether it is still the coded default.

_Wants:_ a long form that stays scannable; the "default" marker legible but
quiet; numbers in mono; save state at the bottom **and** sticky.

#### Payments — `/admin/payments` _(Phase 3)_

_Data per transaction:_ transaction number, customer, amount (paisa → NPR),
provider (`fonepay` | `esewa` | `khalti`), status, created date,
provider reference, fee.

_Wants:_ a dense table with banded rows, right-aligned amounts in mono,
filters by status/provider/date, and a drawer for detail rather than a page
jump.

#### Approvals queue — `/admin/approvals` _(Phase 3)_

The screen where a human decides whether money arrived.

_Data:_ the transaction, plus the customer's uploaded **proof image** (fetched
through a short-lived signed URL) and the expected amount.

_Wants:_ proof image large and zoomable beside the expected amount; approve and
reject as clearly distinct actions; a reason required on reject. This is the
highest-stakes screen in the product — a mis-click posts money to the books.

#### Refunds — `/admin/refunds` _(Phase 4)_

_Data:_ original transaction, requested amount, reason, requester, state
(requested → approved → executed), and the reversing journal entry.

#### Invoices — `/admin/invoices` _(Phase 6)_

_Data:_ invoice number (gapless per fiscal year), customer, issue date, due
date, lines (description, quantity, unit price, amount), subtotal, tax, total,
amount paid, status, PDF link.

#### Subscriptions — `/admin/subscriptions` _(Phase 6)_

_Data:_ customer, product, period start/end, renewal date, state (active,
grace, suspended), last payment.

_Wants:_ the "in grace, expires in N days" state needs to read as urgent
without being alarming — this is a paying customer.

#### Accounting _(Phase 7)_

Five screens: **chart of accounts** (tree, code + name + type), **journals**
(entry header + balanced lines, drill through to source), **reports** (trial
balance, P&L, balance sheet — all tie to the paisa), **periods** (open/closed,
with a lock), **reconciliation** (provider statement against our records, with
mismatches surfaced).

_Wants:_ this is where the ledger metaphor earns its keep — ruled columns,
banded rows, right-aligned figures, credit and debit in their own colours,
totals that visibly reconcile.

#### Clients and projects — `/admin/clients` _(Phase 8)_

_Data:_ client, projects, stages, milestones, deliverables, documents, message
thread.

#### Audit log — `/admin/audit`

_Data:_ actor, action (`cms.publish`, `settings.save`, `refund.approve`),
resource, before/after state (JSON), timestamp, IP, request id.

_Wants:_ a filterable stream; before/after diffs readable without a JSON
viewer.

---

### 3.3 Checkout — `payment.softmato.com`

A customer arrives here from another product, pays, and leaves. **This surface
has no navigation, no marketing, and nothing to click that is not the task.**
Design for a mid-range Android phone on a slow connection first.

#### Checkout — `/checkout/[sessionId]` _(Phase 3)_

_Data:_ merchant name, what is being paid for, **amount in NPR**, expiry
countdown, and the available payment methods (filtered by amount — wallets have
per-transaction limits).

_Wants:_ the amount is the largest thing on the screen. Methods are big, tappable
rows with the provider's name. The expiry is visible but not a panic timer.

#### ~~Manual QR — `/checkout/[sessionId]/qr`~~ — **removed 2026-08-16**

The manual QR flow is gone; there is no screen where a customer uploads a
screenshot for approval. Every payment leaves for a gateway and comes back to
the result pages below.

#### Result pages — success, pending, failed, expired _(Phase 3)_

Four distinct screens. Each says what happened, what it means for the thing
they were buying, and what to do next. Success shows the transaction reference
in mono, and it must be copyable.

---

### 3.4 Client portal — `agency.softmato.com`

Agency clients — non-technical, checking on work they are paying for.

_Screens (Phase 8):_ sign-in; dashboard (their projects and current stage);
project detail (stages, milestones, deliverables, dates); documents (private
files, downloaded through signed links); messages (a thread with the team);
invoices and payments (what is owed, what was paid, pay now).

_Wants:_ calm and few choices. A client should understand where their project
is in five seconds without asking anyone.

---

## 4. Components to define once

Buttons (primary, secondary, ghost, destructive) · form field with label, help
and error · text, textarea, select, checkbox, radio · **markdown editor with
preview** · **image field: upload or paste URL** · slug field · tags input ·
status badge (draft/published, and payment states) · data table with banded
rows and right-aligned numeric columns · **money display** (NPR, mono, tabular)
· **BS date display** (`30 Shrawan 2083 (15 Aug 2026)`) · empty state · loading
skeleton · error state · toast · modal and confirm dialog · drawer · tabs ·
breadcrumbs · pagination · file upload with preview · QR display block ·
timeline · stat tile · "on this page" index · site header, site footer, admin
sidebar.

---

## 5. Non-negotiables

1. **Keyboard navigable throughout.** Every interactive element has a visible
   focus ring — `--ring`, 2px, 2px offset. Never `outline: none` without a
   replacement.
2. **`prefers-reduced-motion` respected everywhere.**
3. **No hover-only affordances.** A row's actions must be reachable on a
   touchscreen; table banding is structural, never hover-only.
4. **Contrast targets in §2.5.** Check them, do not assume them.
5. **Money is never a decoration.** Tabular mono, right-aligned in columns,
   `--credit` and `--flag` used only for their meaning.
6. **Dates show Bikram Sambat with the Gregorian date beside them.** The fiscal
   year runs Shrawan to Ashad, and the week runs Sunday to Friday.
7. **Empty, loading and error states for every list, form and async action.**
8. **Mobile-first for checkout and public.** Admin may assume a desktop but must
   remain usable on a phone.
9. **Nothing that pressures a user.** No countdown urgency on marketing pages,
   no pre-ticked consent, no disguised destructive actions.

---

## 6. Technical constraints

- **Next.js 16 App Router, React 19, Tailwind v4.** Server Components by
  default; `'use client'` only where there is interactivity.
- **Tokens live in `apps/web/app/globals.css`** under `:root` and `.dark`,
  exposed with `@theme inline`. No hardcoded hex in components.
- **No new dependencies without asking.** Icons: inline SVG, or one icon
  library if the founder approves it. No UI kit, no animation library, no
  CSS-in-JS.
- Markdown renders through `react-markdown` — style its elements, never inject
  HTML.
- Images go through the existing `CmsImage` component. Sizes must be declared;
  covers and screenshots sit in fixed-ratio frames so the page does not reflow
  when they load.
- Fonts load through `next/font/google` and self-host. No third-party font
  request.
- **Lighthouse ≥ 95 for performance and accessibility** is an acceptance
  criterion, not an aspiration.

---

## 7. What to deliver

For each surface, in this order:

1. The token block for `globals.css` — the full soil palette, light and dark.
2. The component set in §4, as a page that shows every state of each one.
3. Page layouts, Phase 2 first: home, about, services, service detail,
   products, product detail, team, careers, blog, blog post, contact, legal,
   header, footer, 404.
4. Then admin: sign-in, dashboard, content list, content editor, settings.
5. Then checkout: the four screens.

Show each design in both light and dark where the surface supports dark, and
show every screen at 375px as well as at desktop width.

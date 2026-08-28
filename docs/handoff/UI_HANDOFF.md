# Softmato UI — implementation handoff

Source of truth for the mockups in `softmato-ui-mockups.html` (open it in a browser; every screen is on one canvas). Stack assumed: Next.js + Tailwind + shadcn/ui, matching `SiddTheCoder/soft-cuddle`.

## 1. Palette

The founder narrowed the approved palette to **white, black and emerald**. The terracotta `--accent-strong` and warm-paper cream in `apps/web/app/globals.css` are NOT used. Red survives in one role only, because money legibility depends on it.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#FFFFFF` | page ground |
| `--surface` | `#F6F6F4` | panels, secondary buttons, summary rail |
| `--muted` | `#F5F5F4` | banded table rows, inactive chips |
| `--foreground` | `#1C1917` | text |
| `--muted-foreground` | `#78716C` | secondary text, table headers |
| `--border` | `#E7E5E4` | every hairline |
| `--primary` | `#047857` | primary buttons, active nav, links |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--sidebar` | `#E2E6E3` | admin sidebar only |
| `--credit` | `#1B6B4A` | money in — figures only |
| `--flag` | `#A81E12` | money out, reversed — figures only |
| `--destructive` | `#DC2626` | destructive actions, error borders/text |

Rules that are not negotiable: never colour a non-financial word with credit/flag; never colour an amount with anything but credit/flag/foreground; destructive is for buttons that destroy, flag is for figures.

## 2. Type

- Display **DM Sans** 600, tracking `-0.04em`. Page title 30–32px, section head 20–24px, card title 15–17px.
- Body **Inter** 400/500. Body 14–16px, secondary 12.5–13px. Prose capped at 68ch.
- Data **IBM Plex Mono** with `font-variant-numeric: tabular-nums` — every amount, transaction id, invoice number, account code, date, percentage.
- Eyebrows: Plex Mono 10.5px, uppercase, `0.18em` tracking, muted-foreground. Only where they label a real section.

## 3. Money and dates

- **Lakh–crore grouping**: `12,34,567.00`, `4,86,300.00`, `2,40,000.00`. Never `1,234,567`. Three digits, then pairs. Always two decimals.
- Negative uses a true minus `−` (U+2212): `−3,000.00`.
- Dates BS primary: `12 Bhadra 2082`, `12 Bhadra 2082 (28 Aug 2026)` where precision matters, `2082/05/12` in dense tables. Fiscal year `2082/83`.
- Store UTC, convert at render.

## 4. Component metrics (shadcn defaults, restyled)

- Button `h-9` (36px), `rounded-md` (8px), text-sm/500, `gap-2`, icon 16px. Touch/checkout variants 48px. Focus: 3px ring at `ring/50`. Disabled `opacity-50`.
- Input `h-9`, `rounded-md`, 1px border, `shadow-xs`. Label always above, never placeholder-as-label. Error text below in destructive, naming the problem and the fix.
- Card `rounded-xl` (12–14px), 1px border, `shadow-sm` = `0 1px 2px rgba(0,0,0,.05)`. Floating panels use `0 24px 80px rgba(0,0,0,.10)`.
- Badge `rounded-[3px]`, text-xs/500, tinted ground. Status vocabulary: succeeded/active/reconciled → credit; pending/created/polling → foreground on muted; failed/cancelled/expired → muted-foreground; refunded/reversed/mismatch → flag.
- TabsList `h-9`, `rounded-lg`, `bg-muted`, `p-[3px]`; active trigger white with `shadow-sm`.
- Radius scale 6 / 8 / 10 / 12–14. Nothing rounder.

## 5. The banded table

The one signature move. Odd rows `--background`, even rows `--muted` — structural, always visible, never hover-only. Header row: Plex Mono, 11.5px, uppercase, `0.18em`, muted-foreground, 1px bottom rule. Every amount column right-aligned, mono, tabular. Row height 40px (44px in list views). No zebra *and* border. Real `<table>` markup — screen readers need the row/column relationship.

Used in: payments, ledger/journal, trial balance, invoice history, CMS lists, audit log, the public pricing block, and the in-post comparison table.

## 6. Motion

150–200ms ease-out on opacity and small transforms only. Keyframes used: `rise` (6–8px fade-up for entering rows/dialogs), `spin` (spinners), `pulse` (pending dot), `sway` (the logo's two animated letters, 3s, ±4°). **Checkout gets none of it beyond the spinner.** All of it collapses under `prefers-reduced-motion`.

## 7. Screens in the file

**Public** — home (hero, services, products, pricing receipt, team, CTA, footer), services index, service detail, blog index with working tag filter, blog post, contact with live validation, legal page with on-this-page nav, 404.

**Admin** (`#admin`) — sidebar with 11 working tabs: Dashboard (4 stat tiles, bar chart, method split, recent payments), Blog post editor (tabs, cover upload, publish dialog), Services / Products / Team CMS lists, Approvals queue (approve and reject both post and toast), Payments (filters, export, net row), Ledger (journal + trial balance), Users (roles, who can approve money), Settings (company, payment-method switches, approval threshold), Audit log. Sign-in in default and error states.

**Payments** — desktop checkout (plan radio cards driving a live order summary, method picker, billing fields), billing home (current plan, usage, method, invoice history), and the hosted 420px payment column with every terminal state: method pick, wallet redirect, Fonepay QR, bank transfer details, success, expired, declined, amount mismatch, refunded.

## 8. Behaviour worth copying exactly

- Approving or rejecting a queue item is optimistic, then a toast that names what happened ("Payment approved. Journal entry posted."), auto-dismissed at 2.6s. Empty queue gets a sentence describing what will appear, plus the action.
- Publish is always confirmed by a dialog. Cancel must not fire the success toast.
- The order summary recalculates subtotal, 13% VAT, processing fee and total from the selected plan.
- Contact validation names the fix, not the failure ("Enter a complete email address").
- Copy is sentence case, active voice, no apology in errors: "This payment link expired. Ask HostelHub for a new one."

## 9. Images

Every image area in the mockup is a drop target placeholder. In the real app these map to `CmsImage` fields: home hero, two product screenshots, four team avatars (with an initials fallback tile — design that state first), service hero, blog covers, CMS cover upload, and approval evidence thumbnails.

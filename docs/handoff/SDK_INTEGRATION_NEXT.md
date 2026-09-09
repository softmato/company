# Picking up the SDK integration

Written 2026-09-09, at the end of the session that did the credential cutover.
Everything below is verified state, not intention.

---

## Where things actually are

**Production is migrated, cleaned and healthy.**

- Migrations at **13 of 13** (`0007`–`0012` all applied). `mode` exists on
  `payment_sessions`, `transactions` and `invoices`.
- Test fixtures removed: 91 invoices, 443 sessions, 177 transactions, 586
  ledger entries, 273 journal entries, 4 fake fiscal periods. What is left is
  2 invoices, 2 journal entries and 1 payment session.
- Books balance, all four append-only guards are enabled, and `2083/84` is
  gapless.
- Public site `200`, `/developers` `200`, admin `307`, and an authenticated
  `/api/v1` call with a well-formed credential returns `401` rather than the
  `500` it returned before the cutover.

**`@softmato/sdk@0.1.2` is published** to GitHub Packages, tagged `sdk-v0.1.2`.

**CI is green** as of `60e27b4`. It had been red since 16:03 the previous day
for two unrelated reasons, both fixed: `prettier --check` covers Markdown and
two hand-wrapped documents failed it, and a ref read during render in
`sandbox-notice.tsx`.

**The token situation is resolved, and the resolution is not obvious.**

`softmato` is a **User account, not an organisation** — `gh api users/softmato`
says `type=User`, and the repo's owner type is `User`. The package therefore
belongs to that account, so a token from any other account returns `404` even
with the right scope. The token now in use is a classic PAT created **as
`softmato`**, scoped `read:packages` only.

It is exported as **`NPM_GITHUB_TOKEN`, deliberately not `GITHUB_TOKEN`.**
`gh` prefers `GITHUB_TOKEN` over its own keyring and marks the keyring account
inactive, so a `read:packages`-only token under that name silently breaks every
`gh` command and any git push that uses `gh` as a credential helper. Verified by
running `gh auth status` with the variable set: it reported
`Active account: false` against the real account.

Current state: `NPM_GITHUB_TOKEN` set (40 chars, `ghp_`), `GITHUB_TOKEN`
cleared, `gh auth status` back to `SiddTheCoder (keyring)` with its original
four scopes.

---

## The consuming product

**QuestionCall's web app: `D:\Jiwan-Mijhar\web`**, repo
`github.com/softmato/questioncall-web`, branch `main`. Next.js, and it uses
**npm** — `package-lock.json`, no pnpm lockfile — so the guide's `pnpm add` is
`npm install` here. `D:\Jiwan-Mijhar\app` is the Expo client and the SDK cannot
go in it: server-side only, and every call carries the client secret.

That repo is owned by `softmato`, the same account that owns the package, so
`secrets.GITHUB_TOKEN` in _its_ Actions may be enough if the package has granted
the repo access. Untested — a PAT under `NPM_GITHUB_TOKEN` works either way.

---

## Done 2026-09-09

### 1. The token reads the package ✅

`npm view @softmato/sdk versions` with the two-line `.npmrc` returned
`[ '0.1.0', '0.1.1', '0.1.2' ]`. No 401, no 404 — the account question from the
previous session is settled.

### 2. `.npmrc` in the consuming product ✅

Written beside `web/package.json`, holding the variable reference and no
secret. `.gitignore` there does not cover it, so it will be tracked.

### 3. Installed ✅

`npm install @softmato/sdk` added `^0.1.2`, resolved from
`npm.pkg.github.com/download/@softmato/sdk/0.1.2/...` — 1 package added, no
other tree movement. `import('@softmato/sdk')` under Node 22 loads and exports
`SoftmatoClient`, `verifyWebhook`, `sign`, `signingBase`, `SoftmatoApiError`,
`SoftmatoTransportError`, `API_ERROR_CODES`, `WEBHOOK_EVENTS` and the guards.

Uncommitted in that repo: `.npmrc`, `package.json`, `package-lock.json`. Its
tree also carries unrelated in-progress work on call expiry and a new
`app/api/calls/[id]/heartbeat/` route — commit by explicit path there too.

### 5. `docs/INTEGRATION.md` corrected ✅

The variable is `NPM_GITHUB_TOKEN` throughout, with the `gh`-keyring trap
written down as a blockquote. Two other corrections went in with it: `softmato`
is described as a **User account, not an organisation** — which is the real
reason a foreign token 404s — and the Actions snippet no longer claims the
job's own token is always enough. `docs/MEMORY.md` and
`docs/handoff/SECURITY_HARDENING_PLAN.md` carried the same wrong name and were
fixed.

---

## What is actually left

### 4. Give the deployment the token — needs a human

On Vercel, `NPM_GITHUB_TOKEN` on the **questioncall-web** project, all three
environments, or its build cannot install. Entering the token is a person's
job, not a session's.

### The integration itself — needs a decision, not a keystroke

This is not a blank slate. QuestionCall already runs its own payment stack:
`app/api/payments/esewa/{initiate,verify,course-verify}`, course and chapter
purchase initiation, a wallet, subscriptions, admin transactions, receipts,
refunds and withdrawals. So "integrate the SDK" means choosing what Softmato
takes over — one new flow, or the existing eSewa path re-pointed — and that
choice belongs to the founder. `docs/INTEGRATION.md` §2 is the happy path once
it is made; §5 is the recurring-billing shape if subscriptions are the target.

---

## Loose ends, none of them blocking

- **The `softmato-dev` Sandbox signing secret still needs rotating.** It was
  exposed in a screenshot.
- **The autofill fix has never been verified in a browser.** It needs a real
  password manager, so it wants a human at a Production panel.
- **No `*_LIVE_*` gateway credentials are set anywhere**, so no deployment can
  take Production payments yet. Expected, not a defect — fill them in when a
  product is ready to charge, and note that `*_LIVE_*` has no fallback on
  purpose.
- **Production holds three Sandbox credentials and no Production ones.** Under
  the design decided this session that is fine: Sandbox activity is labelled,
  routed to the providers' test gateways, and hidden from the admin section's
  default Production view.
- **`/admin/invoices` may still show a numbering banner in Sandbox.** The gap
  check is deliberately not mode-filtered, because `allocateSequence` is scoped
  by `(kind, fiscalYear)` with no mode in it and filtering would report every
  Sandbox invoice's number as missing. Production reads gapless.

---

## Uncommitted work in the tree

At the time of writing the working tree carries in-progress work that is **not
mine and was not committed**: brand marks (`apps/web/components/brand/`,
`lib/brand/*`, `public/banks/`, `public/wallets/`), a deleted
`components/checkout/provider-icons.tsx`, and edits to `provider-picker.tsx`,
`dashboard-overview.tsx` and `dashboard-payments.tsx`.

Two commits this session swept up files that were being edited in parallel —
`sandbox-notice.tsx` landed inside `6a0fd52` that way. Commit by explicit path
rather than `git add -A` while that work is open.

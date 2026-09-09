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

## What is left, in order

### 1. Prove the token can read the package

Not yet done. One command, from anywhere:

```bash
cd $env:TEMP; mkdir npmcheck -Force; cd npmcheck
"@softmato:registry=https://npm.pkg.github.com`n//npm.pkg.github.com/:_authToken=`${NPM_GITHUB_TOKEN}" | Set-Content .npmrc
npm view @softmato/sdk versions
```

Expect `[ '0.1.0', '0.1.1', '0.1.2' ]`. A **401** means the scope is wrong; a
**404** means the token belongs to an account that cannot see the package,
which is the failure this section exists to prevent.

### 2. The `.npmrc` in the consuming product

Beside that project's `package.json`, and committed — it holds a variable
reference, never a secret:

```
@softmato:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_GITHUB_TOKEN}
```

### 3. Install and integrate

```bash
pnpm add @softmato/sdk
```

`docs/INTEGRATION.md` is the guide. The SDK is server-side only — it imports
`node:crypto` and every call carries the client secret, so it belongs in route
handlers, never in anything shipped to a device.

### 4. Give the deployment the token

On Vercel, set `NPM_GITHUB_TOKEN` on the **consuming** project or its build
cannot install. In GitHub Actions, map the job token onto the name:

```yaml
env:
  NPM_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 5. Correct `docs/INTEGRATION.md`

It still documents the variable as `GITHUB_TOKEN`, which is the trap described
above. Rename it to `NPM_GITHUB_TOKEN` there and say why, so the next person
does not rediscover it by breaking their `gh`.

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

# @softmato/sdk

The typed client for the Softmato payment API. **Internal to Softmato product
teams** — it is published privately, and there is no public distribution.

Zero runtime dependencies: `fetch` and `node:crypto`. Server-side only, which
is not a limitation but the point — the client secret must never reach a
browser bundle or a mobile app.

---

## Installing it in another Softmato repository

The package lives in **GitHub Packages**, not on npm. Two steps.

**1. Point the `@softmato` scope at GitHub's registry.** In an `.npmrc` beside
your `package.json`:

```
@softmato:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Commit that file. It contains no secret — `${GITHUB_TOKEN}` is expanded from
the environment at install time, which is why it is written as a variable
rather than pasted.

**2. Provide the token.** A GitHub personal access token (classic) with the
**`read:packages`** scope, exported as `GITHUB_TOKEN` locally and set as a
secret in CI. In GitHub Actions the job's own token already works:

```yaml
- run: pnpm install
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Then:

```bash
pnpm add @softmato/sdk
```

If the install 401s, the token is missing or lacks `read:packages`. If it 404s,
the token is fine but the account cannot see the `softmato` organisation — that
is an access problem, not a registry one.

---

## Using it

```ts
import { SoftmatoClient, verifyWebhook } from '@softmato/sdk';

const softmato = new SoftmatoClient({ secret: process.env.SOFTMATO_SECRET! });
```

The full guide, including the rules a live credential is held to, is at
[softmato.com/developers](https://softmato.com/developers) and in
`docs/INTEGRATION.md` in this repository.

---

## Releasing a new version

1. Bump `version` in `package.json`.
2. Merge to `main`.
3. Tag it: `git tag sdk-v0.2.0 && git push origin sdk-v0.2.0`.

`.github/workflows/publish-sdk.yml` typechecks, tests, builds and publishes.
It refuses to run if the tag and the declared version disagree.

---

## Why `main` points at TypeScript source

`package.json` declares `main`, `types` and `exports` as `./index.ts`, and
`publishConfig` overrides all three to `./dist/…`.

That split is deliberate. Inside this monorepo the SDK is consumed as source by
a bundler, so there is nothing to build and no stale `dist/` to get out of step
with the code next to it. The published tarball is the only place a consumer
cannot compile TypeScript, so it is the only place that needs `dist/` — and
`pnpm publish` applies the override, so the two never have to be kept in sync
by hand.

One consequence worth knowing: **relative imports in this package carry `.js`
extensions** (`from './client.js'`). They resolve to the `.ts` files under the
bundler in development and to the emitted `.js` after a build. Node's ESM
resolver requires the extension, so dropping one breaks the published package
while every test in this repository keeps passing.

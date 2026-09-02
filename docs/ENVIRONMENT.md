# Environment

---

## 1. Local setup

```bash
pnpm install
docker compose up -d          # Postgres 16 + Redis
cp .env.example .env.local    # fill in
pnpm db:migrate
pnpm db:seed
pnpm dev
```

No hosts-file entries are needed. Browsers resolve any `*.localhost` name to
127.0.0.1 automatically, so the four surfaces are reachable directly:

```
http://localhost:3000            public site   → softmato.com
http://admin.localhost:3000      admin panel   → admin.softmato.com
http://payment.localhost:3000    checkout      → payment.softmato.com
http://agency.localhost:3000     client portal → agency.softmato.com
```

`proxy.ts` reads the leftmost label of the `Host` header, so the same code
handles `admin.localhost` and `admin.softmato.com` with no environment
branching.

Command-line tools resolve `*.localhost` less reliably than browsers do. Use a
`Host` header when testing with `curl`:

```bash
curl -H 'Host: admin.localhost' http://127.0.0.1:3000/
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine # match Neon's major version
    environment:
      POSTGRES_PASSWORD: softmato
      POSTGRES_DB: softmato_dev
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
  redis:
    image: redis:7-alpine # optional — Upstash free tier also works
    ports: ['6379:6379']
volumes: { pgdata }
```

Everything in development runs on free tiers. Local Postgres costs nothing and
consumes no Neon compute hours.

**QStash needs a public URL.** For local queue testing use the QStash CLI tunnel,
or set `USE_QUEUE=false` to call handlers in-process.

---

## 2. Variables

```bash
# ── Company ────────────────────────────────────────────────
# Legal name is not final. Never hardcode it anywhere.
COMPANY_NAME="Softmato Technology Pvt Ltd"
COMPANY_PAN=
COMPANY_ADDRESS=
COMPANY_EMAIL=                # where contact enquiries are delivered
COMPANY_PHONE=

# ── Core ───────────────────────────────────────────────────
NODE_ENV=development
APP_ENV=local|preview|production
DATABASE_URL=postgresql://postgres:softmato@localhost:5432/softmato_dev

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
USE_QUEUE=true

# ── Security ───────────────────────────────────────────────
AUTH_SECRET=                  # openssl rand -base64 32
AUTH_URL=
CRON_SECRET=                  # bearer for /api/jobs/*
ENCRYPTION_KEY=               # 32 bytes hex, AES-256-GCM, for TOTP secrets

# ── Domains ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://softmato.local:3000
NEXT_PUBLIC_CHECKOUT_URL=http://payment.softmato.local:3000

# ── Payment providers ──────────────────────────────────────
PAYMENT_MODE=mock|sandbox|live

# eSewa. Verified against the live sandbox on 2026-09-02: a form signed with
# this key returns a 302 into the payment page. Quote it — it contains '&',
# ':' and '/', and an unquoted value truncates at the '&', which surfaces as
# eSewa's ES104 "Invalid payload signature" rather than as a parse error.
#
# Two older values in this repo were wrong and both are gone: this file's
# 'LB0REg8HUSw3...' and .env.example's '8gBwcE4DOHB28vvi'. Neither is an eSewa
# key. The variable was also named ESEWA_PRODUCT_CODE here while the code has
# always read ESEWA_MERCHANT_CODE, so this block could not have worked as
# written.
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY="8gBm/:&EnhH.1/q"
ESEWA_ENV=sandbox|live
ESEWA_BASE_URL=               # optional override; default follows ESEWA_ENV
                              # sandbox https://rc-epay.esewa.com.np
                              # live    https://epay.esewa.com.np

# Khalti. The value below is the shared sandbox test key Khalti publishes in
# its own integration examples; a merchant-specific one comes from
# test-admin.khalti.com (login OTP 987654). Khalti names the sandbox key
# 'live_secret_key' too — confusing, and not a live credential.
KHALTI_SECRET_KEY=live_secret_key_68791341fdd94846a146f0457ff7b455
KHALTI_ENV=sandbox|live
KHALTI_BASE_URL=              # optional override; default follows KHALTI_ENV
                              # sandbox https://dev.khalti.com/api/v2
                              # live    https://khalti.com/api/v2

FONEPAY_MERCHANT_CODE=
FONEPAY_SECRET_KEY=
FONEPAY_PG_URL=
FONEPAY_QR_URL=
FONEPAY_ENABLED=false

# ── Storage (Cloudflare R2) ────────────────────────────────
# All five of the public-bucket variables or none of them.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=softmato-data-public
R2_PUBLIC_BASE_URL=           # https://pub-<hash>.r2.dev, or a custom domain

# Optional. Derived from R2_ACCOUNT_ID when unset.
R2_ENDPOINT=                  # https://<account_id>.r2.cloudflarestorage.com
# Phase 3 onwards. Presigned access only.
R2_PRIVATE_BUCKET=softmato-data-private

# ── Services ───────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_DOMAIN=softmato.com     # bare hostname; must be verified in Resend
EMAIL_REPLY_TO=               # optional override; info@EMAIL_DOMAIN is derived
SENTRY_DSN=
```

Validate all of these with Zod at boot (`apps/web/lib/env.ts` — the schema
there is the authority; this list follows it). A missing `ENCRYPTION_KEY` must
fail at startup, not at the first login.

Two groups are optional **as a group**, and half-set is an error at boot rather
than a failure at the first use:

- **R2** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_PUBLIC_BUCKET`, `R2_PUBLIC_BASE_URL`. With none of them set, CMS image
  fields stay plain URL inputs and uploading is simply unavailable.
- **Email** — `RESEND_API_KEY`, `EMAIL_DOMAIN`, `COMPANY_EMAIL`. With none of
  them set, the contact form still writes every enquiry to the database and
  only skips the notification.

  There is no `EMAIL_FROM`. The sender is assembled per message from the
  domain and the message's category, so a receipt leaves as `Softmato Billing
<billing@softmato.com>` and an alert as `Softmato Alerts <alert@…>` —
  docs/EMAIL_SYSTEM.md has the full table. `EMAIL_DOMAIN` is a **bare
  hostname**, not an address, and it must be verified in the Resend account or
  the provider rejects the send. Unset, it falls back to `softmato.com`.

  The domain is the only part of the sender that lives here. The display name,
  the reply address and the mailbox local-parts are all in **Admin →
  Settings → Email**, because they are branding the founder should be able to
  change at 11pm without a deploy. The domain is not branding: it has to match
  what Resend verified, and a settings form is where that gets mistyped.

Never commit `.env*`. Keep `.env.example` current with every new variable.

---

## 3. File storage

Two R2 buckets. **Never one.**

| Bucket                  | Contents                                       | Access         |
| ----------------------- | ---------------------------------------------- | -------------- |
| `softmato-data-private` | payment proofs, invoice PDFs, client documents | presigned only |
| `softmato-data-public`  | CMS images, team photos, blog assets           | public URL     |

Payment proofs contain customer bank details and transaction references.
Invoice PDFs contain customer data. Neither is ever publicly reachable.

Inside each bucket, keys begin with the owner: `company/` today, and a SaaS
product added later takes its own prefix — `saas-app-1/` — in the same two
buckets. **A new product never gets a new pair of buckets.** The split that
protects customer data is public-versus-private, and that is a property of the
bucket. Making it a property of a path is how a proof ends up world-readable
because someone mistyped a prefix. A separate bucket is warranted only when a
product genuinely needs its own credentials or retention policy.

```
softmato-data-public/          softmato-data-private/
└── company/                   └── company/
    ├── images/     ← CMS          ├── proofs/      ← payment proofs
    ├── logos/                     ├── invoices/    ← invoice PDFs
    ├── assets/                    ├── documents/   ← client portal
    └── documents/                 ├── contracts/
                                   ├── reports/
                                   └── backups/
```

```
Admin views a payment proof
  → server verifies admin session
  → checks the admin may view this transaction
  → generates a presigned GET, 5-minute expiry
  → returns the URL
```

Key convention:

```
company/proofs/{fiscal_year}/{transaction_id}/{uuid}.{ext}
company/invoices/{fiscal_year}/{invoice_no}-{fingerprint}.pdf
company/receipts/{fiscal_year}/{txn_no}-{fingerprint}.pdf
company/documents/{client_id}/{project_id}/{uuid}-{filename}
company/images/{uuid}-{slug}.{ext}          ← public bucket
```

Built in `apps/web/lib/storage/object-key.ts` (public) and
`apps/web/lib/documents/object-key.ts` (documents), never by concatenation at
the call site. The slug is passed through a whitelist, so a filename cannot
introduce a path segment or a `..`; a document number and a fiscal year both
contain a slash of their own (`INV-2083/84-000012`, `2083/84`) which becomes a
dash, and anything else in them throws rather than being scrubbed into
something key-shaped.

### Document PDFs are stored, and the key says which version

Rendering a PDF means running a browser — the slowest thing the app does. Each
invoice and receipt is therefore rendered once and read back afterwards:
`POST /v1/invoices` schedules the render for after its response has been sent,
a receipt is stored by the same render that attaches it to the receipt email,
and every download path (`/v1`, the admin screen) goes through
`lib/documents/document-pdf.ts`, which reads the bucket before it reaches for
the engine.

The `{fingerprint}` is the first 16 hex characters of a SHA-256 of the rendered
HTML, and it is what makes serving a stored copy safe. **An invoice is not
frozen once issued** — its badge goes from UNPAID to PAID, its balance falls,
`past_due` appears when the clock passes the due date. Keyed on the invoice
number alone, the first render would be served for months, telling a customer
their settled invoice is unpaid. Content-addressing removes that state rather
than managing it: a document that has changed misses, and is rendered again.
There is no invalidation step to forget and no TTL to tune.

Superseded renders stay in the bucket on purpose. They are what the invoice
looked like when it was sent, which is the question a dispute actually turns
on.

Storage is optional. With `R2_PRIVATE_BUCKET` unset, documents are rendered on
every request exactly as they were before any of this existed, and with no PDF
engine at all the download falls back to HTML with an
`X-Softmato-PDF-Fallback` header. Neither is an error.

### The PDF engine

`lib/documents/pdf.ts` picks one of two, in this order:

|                                      |                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| A Chrome or Edge on the machine      | `CHROME_PATH`, or a standard install location. Every developer, and any container built on a Chrome image. No dependency |
| Chromium bundled into the deployment | `@sparticuz/chromium` + `puppeteer-core`. **This is the production engine** — Vercel's servers have no browser           |

The local binary wins where there is one: it starts faster than unpacking 65 MB
of Chromium into `/tmp`, and the bundled build is Linux x64, so on a Mac or on
Windows it declines and the local path is the only one that runs.

Both packages are in `serverExternalPackages` — `@sparticuz/chromium` finds its
own binary relative to its package directory, and a bundler that inlines the
code moves it away from `bin/`. The binary is then traced into the five routes
that can start a browser (`outputFileTracingIncludes`): the three that read a
document as PDF, and the two that produce one — `POST /v1/invoices`, and the
gateway return page and polling job that settle a payment and email its
receipt. It is 65 MB against a function's size budget, so it goes to those and
nowhere else.

**A render that came out wrong is served but not stored.** If the Google Fonts
faces do not arrive the document is laid out in a fallback face and its figures
lose their tabular alignment; the person who asked still gets a PDF, but the
key is the document's identity, so archiving that one would answer every future
request with the wrong typeface. It is returned with a `degraded` reason and
rendered again next time.

Uploads: validate MIME by **magic bytes, not extension**; cap at 5 MB; strip
EXIF from images. Never trust a client-declared content type.

Access via `@aws-sdk/client-s3` with `region: 'auto'` and the R2 endpoint.

### Admin image uploads are presigned

The file never passes through the server. A Vercel function rejects a request
body over 4.5 MB before the handler runs, which is _below_ the 5 MB above — so
routing bytes through us made the top of the documented range impossible to
upload, and paid to move every megabyte twice.

```
Admin picks an image
  → POST /api/admin/upload          server checks the session and MFA,
                                    allowlists the declared type, builds the
                                    key, returns a presigned PUT (120s)
  → PUT direct to R2                browser → bucket, no server in between
  → POST /api/admin/upload/confirm  server HEADs the object for its real size,
                                    reads the first 16 bytes for its real type,
                                    records the audit row, returns the URL
```

The magic-byte rule is not weakened by this, it moves: the confirm step reads
the bytes back out of the bucket with a Range request before the URL is handed
to the CMS. An object that fails either check is deleted and never named to the
caller — until confirm returns, the key is a uuid nobody can guess and no row
points at it.

The signature pins the key and the `Content-Type` (`SignedHeaders` is
`content-type;host`), so R2 refuses a PUT that stores anything but one of the
four allowed image types. That is what keeps the public bucket from serving
caller-supplied `text/html`.

**The public bucket needs a CORS rule**, or the browser's PUT never leaves.
The uploader lives in the admin, so the origin is the **admin** host — not the
marketing one:

```json
[
  {
    "AllowedOrigins": [
      "https://admin.softmato.com",
      "http://admin.localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

The S3 client sets `requestChecksumCalculation: 'WHEN_REQUIRED'`, and must keep
doing so. On the default the SDK pins a CRC32 of the request body into the
signature — and at signing time there is no body, so what gets pinned is the
checksum of nothing. R2 rejects the real upload with a 403 that carries no CORS
headers, so the browser reports a CORS failure and the actual cause is nowhere
in the message.

Client code never talks to R2 itself — it goes through
`components/admin/uploads` (or `uploadImage` in `lib/admin/upload-image.ts`),
which is the one implementation of the three steps.

---

## 4. Environments

|           | Local                  | Preview        | Production   |
| --------- | ---------------------- | -------------- | ------------ |
| Host      | localhost              | Vercel preview | Vercel Pro   |
| DB        | Docker Postgres        | Neon branch    | Neon         |
| Redis     | Docker or Upstash free | Upstash        | Upstash      |
| Providers | sandbox                | sandbox        | **live**     |
| R2        | dev buckets            | dev buckets    | prod buckets |
| Cron      | manual curl            | disabled       | enabled      |

**Preview deployments must never use live provider credentials.** Every preview
runs `PAYMENT_MODE=sandbox`. Verify this before enabling preview deployments at
all.

---

## 5. Deployment

```json
// vercel.json
{ "regions": ["bom1"] }
```

`bom1` is Mumbai — ~40–60ms from Nepal, and next to the database. Without
pinning, functions default to a US region and every query crosses the world.
Region selection is free; only multi-region is a paid feature, and we don't
want it.

Pipeline: push → GitHub Actions (typecheck, lint, test, migrate-check) →
Vercel build → deploy.

Migrations run as a deliberate step against production, never automatically on
deploy.

**Vercel's Hobby plan is non-commercial.** Development on a personal account is
fine; Softmato's production deployment needs Pro.

---

## 6. Cron

Jobs live at `/api/jobs/*` and require `Authorization: Bearer ${CRON_SECRET}`.

Three requirements, because Khalti confirmation now depends on cron:

1. **Timing-safe secret comparison.** Return **404**, not 401, on mismatch —
   the endpoints should not be discoverable.
2. **Idempotent and self-healing.** Query by state ("all transactions pending
   and due"), never "what changed since last run." A missed run is caught by
   the next.
3. **Dead-man's switch.** `heartbeat` pings every 5 minutes. If none arrives for
   15, alert. Otherwise cron can stop silently and you find out from a customer.

Either cron-job.org or QStash schedules. QStash means one fewer vendor and
better failure visibility.

---

## 7. Cost

**Development: ₨0.** Local Postgres, free tiers everywhere, no credit card.
The only cost is the domain.

**Production: ~$25–35/month.**

|                              |                                               |
| ---------------------------- | --------------------------------------------- |
| Vercel Pro                   | $20                                           |
| Neon                         | $5–15, usage-based, scales to zero            |
| Upstash Redis + QStash       | free at this volume                           |
| Cloudflare R2                | free — 10 GB, 1M/10M ops monthly, zero egress |
| Resend, Sentry, cron-job.org | free tiers                                    |

Watch Neon compute as you grow — it bills per CU-hour, so an always-busy
database climbs. That's a launch-plus-one-year problem, not a today problem.

---

## 8. Secrets

Vercel environment variables, encrypted at rest, scoped per environment.

Rotation: `AUTH_SECRET` and `CRON_SECRET` annually or on suspected compromise.
Provider keys per the provider's policy. Application secrets on demand, with a
24-hour overlap.

**Before every deploy, confirm no secret reaches a client bundle.** Only
`NEXT_PUBLIC_*` variables are safe in browser code, and none of those may
contain a credential.

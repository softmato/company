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

`middleware.ts` reads the leftmost label of the `Host` header, so the same code
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
PAYMENT_MODE=sandbox|live

ESEWA_PRODUCT_CODE=EPAYTEST
ESEWA_SECRET_KEY=LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==   # eSewa's published dev key
ESEWA_BASE_URL=https://rc-checkout.esewa.com.np

KHALTI_SECRET_KEY=
KHALTI_BASE_URL=https://dev.khalti.com/api/v2

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
EMAIL_FROM="Softmato <no-reply@softmato.com>"
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
- **Email** — `RESEND_API_KEY`, `EMAIL_FROM`, `COMPANY_EMAIL`. With none of
  them set, the contact form still writes every enquiry to the database and
  only skips the notification. `EMAIL_FROM` must sit on a domain verified in
  the Resend account, or the provider rejects the send.

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
company/invoices/{fiscal_year}/{invoice_no}.pdf
company/documents/{client_id}/{project_id}/{uuid}-{filename}
company/images/{uuid}-{slug}.{ext}          ← public bucket
```

Built in `apps/web/lib/storage/object-key.ts`, never by concatenation at the
call site. The slug is passed through a whitelist, so a filename cannot
introduce a path segment or a `..`.

Uploads: validate MIME by **magic bytes, not extension**; cap at 5 MB; strip
EXIF from images. Never trust a client-declared content type.

Access via `@aws-sdk/client-s3` with `region: 'auto'` and the R2 endpoint.

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

# Cron jobs

Every background job, and exactly how to set it up in the **cron-job.org** web
UI. Four jobs. Written 2026-09-01.

One of them is on the payment critical path: if
`poll-pending-transactions` stops, payments stop being confirmed and the site
gives no sign of it. Read [§6](#6-the-failure-that-matters) before you finish.

---

## 1. The five settings that are the same for every job

Set these identically on all four. Only the URL and the schedule differ.

| Where | Field | Value |
| --- | --- | --- |
| Common | **URL** | `https://softmato.com/api/jobs/<job-name>` |
| Common | **Folder** | Softmato Company Crons |
| Common | **Enable job** | on |
| Common | **Save responses in job history** | **on** — see [§5](#5-save-responses-in-job-history) |
| Advanced | **Request method** | `POST` |
| Advanced | **Time zone** | `UTC` |
| Advanced | **Timeout** | `30` seconds (the maximum) |
| Advanced | **Headers** | one header — see below |
| Advanced | **Requires HTTP authentication** | **off** — see below |
| Advanced | **Request body** | leave empty |
| Advanced | **Treat redirects as success** | off |

### The auth header

Under **Advanced → Headers**, press **+ ADD** and enter:

| Name | Value |
| --- | --- |
| `Authorization` | `Bearer <CRON_SECRET>` |

`<CRON_SECRET>` is the value of `CRON_SECRET` in the production environment.
Paste it with the word `Bearer` and a single space in front. Nothing else.

**Do not use the "Requires HTTP authentication" toggle.** That is HTTP Basic
auth: it sends `Authorization: Basic base64(user:password)`, which is not the
scheme the guard checks, and every execution would fail. The credential goes in
a custom header, not in that box.

There is no `X-Secret` header. The guard reads `Authorization` only
(`apps/web/lib/jobs/guard.ts`).

### Why the apex host

`https://softmato.com/...`, not `admin.` or `payment.`. The subdomain proxy
rewrites by host, and `/api/` is excluded from that rewriting on purpose
(`apps/web/proxy.ts`) — these endpoints authenticate by credential, not by
subdomain. The apex is the plain choice and works.

### What a wrong secret looks like

**404, not 401.** Deliberate: a 401 would confirm the endpoint exists and turn
a guessed URL into a target worth attacking. So if a job suddenly returns 404,
suspect the header before you suspect the deploy.

---

## 2. The four jobs

### `poll-pending-transactions` — every minute

```
https://softmato.com/api/jobs/poll-pending-transactions
```

| Setting | Value |
| --- | --- |
| Schedule | **Custom** → crontab `* * * * *` |
| Notify on failure | **on**, after `3` failures |

**This is the one that matters.** Khalti never pushes a webhook, eSewa's return
trip depends on the customer's browser completing a redirect, and any customer
may close the tab. For a large share of payments this job is the only thing
that will ever notice the money arrived.

It asks each provider about transactions that are due a check, on a backoff of
30s → 1m → 2m → … capped hourly. **25 transactions per run** — see
[§6](#6-the-failure-that-matters) for why that number and not more.

Response looks like:

```json
{ "job": "poll-pending-transactions", "ok": true, "ms": 412,
  "examined": 3, "settled": 1, "stillPending": 2,
  "closed": 0, "flagged": 0, "errors": 0 }
```

`errors` counts providers that could not be reached. A few is normal; a run
where `errors` equals `examined` means a gateway is down or a credential is
wrong.

---

### `retry-webhooks` — every minute

```
https://softmato.com/api/jobs/retry-webhooks
```

| Setting | Value |
| --- | --- |
| Schedule | **Custom** → crontab `* * * * *` |
| Notify on failure | **on**, after `3` failures |

Despite the name it sends first attempts too — `enqueueWebhook` writes a row
due immediately and this is what delivers it. Eight failures, then the delivery
is marked `abandoned` and left for an admin replay.

```json
{ "job": "retry-webhooks", "ok": true, "ms": 88,
  "attempted": 2, "delivered": 2, "failed": 0, "abandoned": 0 }
```

`ok: true` with `failed: 2` is not a contradiction: the *job* succeeded, and
two *consumers* did not answer. Only `ok: false` means our side broke.

---

### `expire-stale-sessions` — every 5 minutes

```
https://softmato.com/api/jobs/expire-stale-sessions
```

| Setting | Value |
| --- | --- |
| Schedule | **Every** → `5 minutes` (crontab `*/5 * * * *`) |
| Notify on failure | on, after `3` failures |

A sweeper, not a safety mechanism. Every payment path already settles expiry
when it reads a session, so an expired session cannot be paid whether or not
this runs. What it does is stop abandoned checkouts sitting as permanently
"open" and skewing every count on the admin screens.

It never touches transactions. A session lapsing does not mean the customer
failed to pay — they may be finishing at the gateway right now.

```json
{ "job": "expire-stale-sessions", "ok": true, "ms": 61,
  "expired": 4, "skipped": 0 }
```

`skipped` counts sessions something else moved first — usually a payment
landing in the same instant. Not a failure.

---

### `heartbeat` — every 5 minutes

```
https://softmato.com/api/jobs/heartbeat
```

| Setting | Value |
| --- | --- |
| Schedule | **Every** → `5 minutes` (crontab `*/5 * * * *`) |
| Notify on failure | **on**, after `1` failure |

The dead-man's switch. Notify after **1**, not 3 — this job exists to be
noticed, and it does no work worth retrying.

It does not merely return 200. It queries the database, because a heartbeat
that cannot tell "cron is alive" from "cron is alive and the database is
reachable" would keep reassuring you through the failure that stops every other
job. It also reports the backlog:

```json
{ "job": "heartbeat", "ok": true, "ms": 44,
  "at": "2026-09-01T18:00:00.000Z",
  "liveTransactions": 2, "flaggedForReview": 0, "overduePolls": 0 }
```

**`overduePolls` is the number to watch.** It counts live transactions whose
poll fell due more than ten minutes ago. On a one-minute cadence it should be
`0`. Anything else means the poller has stopped or cannot keep up — and it will
show up here while `poll-pending-transactions` still reports success, because a
disabled job reports nothing at all.

`flaggedForReview` above zero means someone should open `/admin/reconciliation`.

---

## 3. Setting one up, start to finish

1. **Cronjobs → Softmato Company Crons → Create cronjob**
2. **Common** tab
   - Title: the job name, e.g. `poll-pending-transactions`
   - URL: `https://softmato.com/api/jobs/poll-pending-transactions`
   - Folder: Softmato Company Crons
   - Enable job: on. Save responses in job history: **on**
   - Execution schedule: **Custom**, crontab `* * * * *`
   - Notify me when… **execution of the cronjob fails** → on, after `3`
   - Leave **the cronjob will be disabled because of too many failures** on
3. **Advanced** tab
   - Requires HTTP authentication: **off**
   - Headers → **+ ADD** → `Authorization` = `Bearer <CRON_SECRET>`
   - Time zone: `UTC` · Request method: `POST` · Request body: empty
   - Timeout: `30`
4. **TEST RUN** before **CREATE**. A correct setup returns HTTP 200 and a JSON
   body starting `{"job":"…","ok":true`. A **404 means the header is wrong** —
   check for a missing `Bearer `, a trailing space, or the wrong environment's
   secret.
5. **CREATE**

Repeat for the other three, changing only the URL, the title and the schedule.

---

## 4. Order of setup

Set them up in this order, and do not skip the first step.

1. `heartbeat` first, and confirm it returns 200. It proves the URL, the host
   and the secret are all right before you debug anything more complicated.
2. `expire-stale-sessions` — harmless if it misfires.
3. `retry-webhooks`.
4. `poll-pending-transactions` last. It touches money.

---

## 5. Save responses in job history

Leave this **on** for all four.

It is off by default in the cron-job.org UI, and the responses are the only
record of what these jobs did that survives outside our own logs. When a
customer says they paid and the invoice is unpaid, the question is "did the
poller see it, and what did the provider say" — and that history answers it in
seconds.

None of the four responses contains a secret, a customer name, an email
address or a provider payload. They are counters and one timestamp.

---

## 6. The failure that matters

**cron-job.org disables a job after too many failed executions**, and an
execution that exceeds the 30-second timeout counts as failed even though the
request kept running on our side and did its work.

Chain that together: a slow batch → repeated "failures" → cron-job.org disables
`poll-pending-transactions` → payments where the customer closed the tab stop
being confirmed → **nothing anywhere reports an error**, because the job is not
running to report one. The site is up, checkout works, and money quietly stops
being booked.

Three things guard against it, and you should know all three:

1. **Batch limits are sized against the timeout, not against the work.** Both
   per-minute jobs process **25 rows per run**, because each row costs a
   network round trip and 100 of them would not finish in 30 seconds. A backlog
   is drained by the next run — the jobs query by state, never "what changed
   since last time", so a small batch costs latency and never work.
2. **`heartbeat`'s `overduePolls`** is the independent signal. It rises when
   the poller has stopped, and it rises *while the poller reports nothing at
   all*.
3. **Leave the failure notification on.** After 3 failures for the workers,
   after 1 for the heartbeat.

If you ever see `poll-pending-transactions` disabled in the cron-job.org UI:
re-enable it, then check `ms` in its recent job history. If runs are landing
near 30,000 the batch limit needs lowering in
`packages/payment-core/jobs/poll-pending.ts`, not raising in cron-job.org.

---

## 7. Not set up yet

These are in `docs/ARCHITECTURE.md` §6 and belong to later phases. Do not
create them yet — the endpoints do not exist and every execution would 404.

| Job | Frequency | Phase |
| --- | --- | --- |
| `recognize-revenue` | monthly | 6 |
| `generate-renewal-invoices` | daily | 6 |
| `send-dunning-reminders` | daily | 6 |
| `suspend-past-grace` | daily | 6 |
| `reconcile-providers` | daily | 7 |

Add them to this file when they are built.

---

## 8. Reference

| Thing | Where |
| --- | --- |
| The auth guard | `apps/web/lib/jobs/guard.ts` |
| The route wrapper | `apps/web/lib/jobs/endpoint.ts` |
| Routes | `apps/web/app/api/jobs/*/route.ts` |
| Poll logic and backoff | `packages/payment-core/jobs/` |
| Webhook delivery | `packages/payment-core/webhooks/deliver.ts` |
| Schedule spec | `docs/ARCHITECTURE.md` §6, `docs/ENVIRONMENT.md` §6 |

Every job is **self-healing**: it queries by state, never by "what changed
since the last run". A missed execution is caught by the next one, and running
one twice does nothing twice.

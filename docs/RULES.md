# Rules

This project handles real money. These are not style preferences.

---

## 1. When to stop and ask

Stop and ask the founder rather than deciding, whenever:

- A design decision isn't covered by these docs
- A posting rule isn't in `CHART_OF_ACCOUNTS.md` §9 — **never improvise a
  journal entry**
- A provider's request or response shape is unclear (especially Fonepay, which
  has no reliable public spec)
- A database constraint blocks you
- Something in these docs contradicts something else
- A task seems to require deviating from `ARCHITECTURE.md` or `PRD.md`

Guessing here is worse than a delay. A plausible-looking wrong answer in a
payment path is the most expensive kind of mistake this project can make.

Open items awaiting founder input are listed in `MEMORY.md`.

---

## 2. Money — absolute rules

1. **All money is `BIGINT` in paisa.** `bigint` in TypeScript, `BIGINT` in
   Postgres. Never `number`, never `float`, never `NUMERIC` for currency.
   NPR 5,000 is `500000n`.
2. **Never trust the client.** Not the amount, not the product, not the invoice
   status, not a redirect query parameter, not a webhook body before its
   signature is verified. The server recomputes from its own records.
3. **A redirect is never proof of payment.** Only a signature-verified callback
   or an authenticated server-side lookup marks a payment successful. A user
   typing `?status=Completed` must achieve nothing.
4. **Every state-changing write is idempotent**, keyed on a provider event ID or
   a client-supplied `Idempotency-Key`.
5. **Ledger writes happen in one transaction** with `SELECT … FOR UPDATE` on the
   affected row.
6. **Never `UPDATE` or `DELETE` a ledger row.** Corrections are reversing
   journal entries. The database will reject the attempt.
7. **Never compute a provider fee** when the provider returns it. Khalti's
   lookup response includes `fee` — use that number.
8. **Never auto-resolve a reconciliation mismatch.** Flag it for a human.
9. **Timestamps are `timestamptz`, stored UTC.** BS dates and fiscal periods are
   derived at display only.

---

## 3. Never weaken a constraint

The database constraints are the product, not an obstacle.

If a test fails because a constraint rejected a write, **the code is wrong**.
Do not:

- Drop or alter the journal balance trigger
- Disable the ledger immutability triggers
- Remove `succeeded_needs_journal`
- Remove the `UNIQUE (provider_id, provider_ref)` on transactions
- Relax `totp_required` on `admin_users`
- Add `ON DELETE CASCADE` to anything financial

If you believe a constraint is genuinely wrong, stop and ask. Do not change it
unilaterally.

**One exception, already flagged:** `refund_needs_second_person` requires
`approved_by <> requested_by`, which one founder cannot satisfy alone. The
founder decides whether to relax it. Until they say so, leave it.

---

## 4. Libraries

### Use

| Purpose          | Library                                         |
| ---------------- | ----------------------------------------------- |
| ORM / queries    | `drizzle-orm`                                   |
| DB driver        | `@neondatabase/serverless` (prod), `pg` (local) |
| Validation       | `zod` — every API boundary                      |
| Auth             | `next-auth` (Auth.js)                           |
| Password hashing | `@node-rs/argon2`                               |
| TOTP             | `otpauth`                                       |
| Redis            | `@upstash/redis`                                |
| Rate limiting    | Vercel firewall (edge, no dependency)           |
| Queue            | `@upstash/qstash`                               |
| Object storage   | `@aws-sdk/client-s3` against R2                 |
| Email            | `resend` + `@react-email/components`            |
| UI               | `shadcn/ui`, `tailwindcss`, `lucide-react`      |
| Markdown         | `react-markdown` + `remark-gfm`                 |
| Tables           | `@tanstack/react-table`                         |
| Charts           | `recharts`                                      |
| Dates            | `date-fns` + a BS conversion library            |
| Testing          | `vitest`, `@playwright/test`                    |
| PDF              | `@react-pdf/renderer`                           |

### Do not use

| Avoid                                     | Why                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Prisma**                                | Hides the SQL we need explicit control over                                                               |
| **`bcrypt`**                              | argon2id is the current standard                                                                          |
| **`moment`**                              | Unmaintained, huge                                                                                        |
| **`decimal.js` for currency**             | We use integer paisa; a decimal library invites float thinking                                            |
| **`crypto-js`**                           | Use Node's `crypto`                                                                                       |
| **Markdown → HTML string + a sanitiser**  | `react-markdown` renders React elements, so no `dangerouslySetInnerHTML` and no sanitiser to misconfigure |
| **Any ORM auto-migration in production**  | Migrations are reviewed files                                                                             |
| **`localStorage` for anything sensitive** | Session cookies only                                                                                      |
| **A second database**                     | One Postgres. Use `JSONB` for document-shaped data                                                        |

Adding a dependency not on this list requires asking first. Every dependency is
a maintenance liability for a two-person team.

---

## 5. Error handling

**Never swallow an error in a payment path.** No empty `catch`, no
`catch { return null }` on anything financial.

```ts
// Wrong
try { await postJournal(...) } catch { /* whatever */ }

// Right
try {
  await postJournal(...)
} catch (err) {
  logger.error({ err, transactionId, journalInput }, 'journal posting failed')
  Sentry.captureException(err, { extra: { transactionId } })
  throw err                    // let the transaction roll back
}
```

**Fail closed.** If verification is uncertain, the payment is not successful.
Never default to success.

**Typed errors, not strings.**

```ts
class PaymentError extends Error {
  constructor(
    readonly code:
      | 'INVALID_SIGNATURE'
      | 'AMOUNT_MISMATCH'
      | 'SESSION_EXPIRED'
      | 'PROVIDER_UNAVAILABLE'
      | 'DUPLICATE_EVENT'
      | 'INSUFFICIENT_SCOPE',
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
  }
}
```

**Never leak internals to a client.** Log the detail; return a stable code and a
generic message. A provider error message may contain merchant identifiers.

**Log every provider request and response**, secrets redacted. On Vercel there
is no SSH — the audit log is the debugger.

---

## 6. Security

- No provider secret, API key, or webhook secret in any client bundle. Audit
  this before every deploy.
- Timing-safe comparison for every secret and signature —
  `crypto.timingSafeEqual`, never `===`.
- Verify a webhook signature **before** parsing or acting on the body.
- Rate limit every public endpoint (`API.md` §7).
- Tenant isolation is enforced at the data layer, filtered by the authenticated
  identity — never by a URL parameter.
- Encrypt TOTP secrets at rest with `ENCRYPTION_KEY`.
- R2 private bucket is never public. Presigned URLs only, 5-minute expiry,
  issued after an authorization check.
- Validate uploads by magic bytes, not file extension. Cap at 5 MB. Strip EXIF.

---

## 7. Wrong even if it works

Each of these passes a happy-path test and is still a defect:

- Marking an invoice paid from a redirect parameter
- Storing money as `number` or `float`
- A `paid: boolean` instead of the status enum
- Computing a provider fee as a percentage when the API returns it
- `UPDATE`ing a ledger row to fix a mistake
- Processing a callback inline instead of enqueueing
- Trusting a client-supplied amount
- A cron job that depends on the previous run having succeeded
- Any provider secret reaching a browser
- Auto-resolving a reconciliation mismatch
- Loosening a database constraint to make a test pass
- Catching and ignoring an error in a payment path
- Comparing secrets with `===`
- Filtering a tenant query by a URL parameter

---

## 8. Working method

- Work phase by phase (`PHASES.md`). Do not start a phase before the previous
  one's acceptance criteria pass.
- Small commits, one concern each. Conventional commit messages.
- Write the test alongside the code for anything financial, not afterwards.
- Do not refactor outside the current task's scope.
- Do not add features nobody asked for.
- Update `MEMORY.md` before ending a session.
- **Never leave a payment path half-implemented across a session boundary.**
  Finish it or revert it.

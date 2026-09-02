# Database

Full DDL: [`schema.sql`](./schema.sql). Posting rules:
[`CHART_OF_ACCOUNTS.md`](./CHART_OF_ACCOUNTS.md).

This document explains _why_ the schema is shaped the way it is. Read it before
changing anything.

---

## 1. Principles

1. **The database enforces correctness, not the application.** A bug in
   application code must not be able to corrupt the books.
2. **All money is `BIGINT` in paisa.** Never `NUMERIC`, never floating point.
   The one `NUMERIC` in the schema is `invoice_lines.quantity`, which is not
   money.
3. **All timestamps are `timestamptz`, stored UTC.** BS dates and the
   Shrawan–Ashad fiscal year are derived at display.
4. **Financial history is append-only.** Corrections are reversing entries.
5. **Every ledger line carries a product dimension** so per-product P&L needs no
   extra accounts.

---

## 2. The four guarantees

These are the reason we chose PostgreSQL. Each is enforced by the database.

### 2.1 A journal cannot commit unbalanced

`ledger_entries` has a `DEFERRABLE INITIALLY DEFERRED` constraint trigger that
runs at `COMMIT`. It groups the journal's lines by currency and requires debits
minus credits to be zero for each. Deferred so lines can be inserted one at a
time inside a transaction.

It also rejects a journal with no lines.

A `CHECK` constraint cannot do this — `CHECK` operates on a single row and this
rule spans rows. That is precisely why a document database could not enforce it
at all.

### 2.2 Ledger rows are immutable

`ledger_entries` rejects `UPDATE` and `DELETE` outright.

`journal_entries` allows exactly one mutation: setting
`reversed_by_journal_id`. Everything else — journal number, period, source,
timestamps — is frozen once posted.

`audit_logs` and `provider_events` are likewise protected.

### 2.3 Closed periods reject postings

A `BEFORE INSERT` trigger on `journal_entries` checks the target fiscal
period's status. `closed` and `locked` reject everything except a
`period_close` journal.

### 2.4 An admin cannot exist without 2FA

```sql
CONSTRAINT totp_required CHECK (NOT is_active OR totp_enabled)
```

An active admin with `totp_enabled = false` is not representable.

---

## 3. Ledger structure

The common mistake is `debit` and `credit` columns on the same row. This schema
does not do that.

```
journal_entries          one economic event
   └── ledger_entries    one row per side
        account_code
        direction        'debit' | 'credit'
        amount_minor     always positive
        product_id       reporting dimension
```

`amount_minor` is always positive. Direction carries the sign. This means
`CHECK (amount_minor > 0)` is meaningful, and aggregation is a simple
`CASE WHEN direction = 'debit'` — no sign errors from negative values.

Journal numbers are gapless per fiscal year: `JE-2082/83-000001`. Same for
invoices and transactions. Gapless numbering matters for audit; allocate inside
the transaction.

---

## 4. Tables that carry the most weight

### `transactions`

```sql
UNIQUE (provider_id, provider_ref)
UNIQUE (provider_id, provider_txn_id)
```

**This is the anti-double-credit guard.** A retried webhook, a duplicated
polling result, or a race between the callback and the poll job cannot create a
second transaction for the same provider reference. The database refuses.

```sql
CONSTRAINT succeeded_needs_journal CHECK (
  status NOT IN ('succeeded','refunded','partially_refunded')
  OR journal_id IS NOT NULL
)
```

A successful transaction without ledger entries is not representable. If this
constraint blocks you, the code is wrong.

```sql
CONSTRAINT net_consistent CHECK (
  net_amount_minor = gross_amount_minor - provider_fee_minor
)
```

Arithmetic that must hold, enforced rather than assumed.

Polling columns (`poll_attempts`, `next_poll_at`, `last_polled_at`) exist
because Khalti has no webhook — polling is a primary confirmation path, not
housekeeping. The partial index `txn_poll_idx` serves that job's hot query.

### `provider_events`

```sql
UNIQUE (provider_id, provider_event_id, event_type)
```

Raw payloads, stored before processing, deduplicated by the database. If a
provider sends the same event five times, there is one row and one effect.

This table is also the debugger. On Vercel there is no SSH — when a payment
behaves strangely, the full request history is here.

### `payment_sessions`

```sql
CONSTRAINT session_id_format CHECK (id ~ '^cs_(live|test)_[A-Za-z0-9_-]{32,}$')
```

Enforces the ID shape at the database, so a weak generator cannot silently ship.
32+ bytes of CSPRNG entropy, 30-minute expiry (Khalti links die at 60).

Server-side session state is why we don't put payment data in an encrypted URL:
the server stays the source of truth.

### `invoices`

```sql
UNIQUE (fiscal_year, sequence_no)
CONSTRAINT total_consistent CHECK (total = subtotal - discount + tax)
CONSTRAINT no_overpayment   CHECK (paid_minor <= total_minor)
```

`service_starts_at` / `service_ends_at` drive deferred revenue. Present for
subscriptions, `NULL` for one-off project work.

`tds_withheld_minor` handles Nepali agency invoices where the client withholds
tax and pays net.

### `refunds`

```sql
CONSTRAINT refund_needs_second_person CHECK (
  status NOT IN ('approved','pending','succeeded')
  OR (approved_by IS NOT NULL AND approved_by IS DISTINCT FROM requested_by)
)
```

Segregation of duties. **Currently unsatisfiable with one founder** — awaiting a
decision on whether to relax it. Do not change it unilaterally.

### `applications`

Secrets stored as argon2id hashes with `secret_last4` for display. Scopes as a
`TEXT[]` with a `CHECK` restricting them to the known set — an unknown scope
cannot be persisted.

`webhook_secret` is the exception to "never plaintext": it signs outbound
deliveries and the consumer has to verify against the same bytes, so it cannot
be a hash. It is never selected by any list query — reading it is a separate,
audited act.

### `application_domains`

The hostnames an application may send customers to and receive webhooks on.

```
application_id  → applications(id) ON DELETE CASCADE
hostname        text, unique per application
note            text — why it is on the list
created_by      text — the admin who added it
```

The shape rules are a `CHECK`, not a convention: lowercase, no `/`, `:`, `*` or
whitespace, dot-separated LDH labels, 4–253 characters, and **no all-numeric
final label** — that last one is what refuses `169.254.169.254`, which is four
perfectly legal labels and the cloud metadata address. They are in the database
rather than only in the form because a row written by a script or a `psql`
session is the one that will not have been normalised.

**No wildcards, and matching is exact equality.** A wildcard is how an allowlist
becomes an allow-anything the day a subdomain is lost, and `endsWith` on
`questioncall.com` matches `evilquestioncall.com`. `assertRegisteredHost` is the
only reader.

### `admin_users`

`totp_secret` is encrypted at rest with `ENCRYPTION_KEY` before insert. The
database never sees plaintext.

---

## 5. Fiscal periods

```
fiscal_year   '2082/83'
period_no     1 = Shrawan … 12 = Ashad
starts_at / ends_at    timestamptz, UTC
status        open | reconciliation_required | closed | locked
```

Seed twelve rows per BS year. `postJournal()` resolves `occurredAt` to a period
by range. Do not compute periods from Gregorian months — the boundaries don't
align, and BS months vary in length.

Store UTC; convert to BS only for display.

---

## 6. Views

| View                    | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `v_trial_balance`       | Per-account debit, credit, and signed balance by fiscal year |
| `v_product_pl`          | P&L lines grouped by product, period, and account            |
| `v_unbalanced_journals` | **Must always return zero rows**                             |

Wire `v_unbalanced_journals` to an alert and assert it empty at the end of every
test suite. If it ever returns a row, something has gone badly wrong.

---

## 7. Migrations

- Drizzle Kit generates them; **review every generated file before applying**
- Never auto-migrate in production
- Never write a migration that drops or weakens a constraint from §2
- Additive changes preferred; a destructive change needs founder approval
- Every migration runs against local Postgres **and** a Neon branch before merge

---

## 8. Local vs. production driver

```ts
export const db =
  process.env.NODE_ENV === 'production'
    ? drizzle(neon(process.env.DATABASE_URL!)) // HTTP
    : drizzle(new Pool({ connectionString: process.env.DATABASE_URL! }));
```

Local is Docker Postgres 16 — match Neon's major version.

**The catch:** Neon's HTTP driver does not handle multi-statement transactions
the same way a pooled TCP connection does. Ledger writes need a real
transaction. Use Neon's pooled connection for those paths, and run the test
suite against a Neon branch before accepting any phase. A test that passes
locally and fails on Neon is exactly the failure mode to catch early.

---

## 9. Extending the schema

**Safe:** adding a leaf account, a product, a provider, a new table that
references existing ones, an index, a nullable column.

**Ask first:** anything touching `ledger_entries` or `journal_entries`, any
change to a constraint in §2, any change to the money type or unit, adding a
second database.

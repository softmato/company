# API

Two audiences: the SaaS products that consume `/api/v1`, and the provider
integrations this platform implements.

---

## 1. Conventions

- Base: `https://api.payment.softmato.com/v1` (routed to `/api/v1/*`)
- All requests and responses are JSON
- **Amounts are integers in paisa.** `500000` is NPR 5,000
- Timestamps are ISO 8601 UTC
- Every request needs `Authorization: Bearer <client_secret>`
- Mutating requests need `Idempotency-Key`

Error shape:

```json
{
  "error": {
    "code": "AMOUNT_MISMATCH",
    "message": "Provider reported an amount that differs from the invoice",
    "request_id": "req_01J..."
  }
}
```

| Code                   | HTTP |
| ---------------------- | ---- |
| `UNAUTHENTICATED`      | 401  |
| `INSUFFICIENT_SCOPE`   | 403  |
| `RESOURCE_NOT_FOUND`   | 404  |
| `IDEMPOTENCY_CONFLICT` | 409  |
| `VALIDATION_FAILED`    | 422  |
| `RATE_LIMITED`         | 429  |
| `INTERNAL`             | 500  |
| `PROVIDER_UNAVAILABLE` | 502  |

`INTERNAL` is the catch-all for anything unrecognised. It is not something a
caller can act on, but it exists so that our own bug is not reported as
`PROVIDER_UNAVAILABLE` — blaming a provider for our crash makes an outage
look like theirs.

Never leak provider internals in `message`. Log the detail, return the code.
The message a client sees is fixed per code in
`packages/payment-core/errors.ts`; it is never the thrown error's message.

---

## 2. Authentication

Each SaaS gets a `client_id` and a secret. The secret is stored only as an
argon2id hash — it is displayed once at issue and never again.

Scopes: `payment:create`, `payment:read`, `invoice:create`, `invoice:read`,
`refund:request`, `customer:read`.

Never granted to a SaaS: refund approval, accounting access, cross-product
reads, provider configuration, admin anything.

Rotation issues a new secret with a 24-hour overlap. Revocation is immediate.

---

## 3. Endpoints

### `POST /v1/invoices` — scope `invoice:create`

```json
{
  "external_ref": "HH-2026-00123",
  "customer": {
    "external_ref": "cust_88",
    "name": "Ram Sharma",
    "email": "ram@example.com",
    "phone": "98XXXXXXXX"
  },
  "lines": [
    {
      "description": "HostelHub Standard — 12 months",
      "quantity": 1,
      "unit_price_minor": 1200000
    }
  ],
  "service_starts_at": "2026-08-15T00:00:00Z",
  "service_ends_at": "2027-08-15T00:00:00Z",
  "due_at": "2026-08-22T00:00:00Z"
}
```

`service_starts_at`/`service_ends_at` drive deferred revenue. Omit for one-off
work. `external_ref` is unique per application — a repeat returns the existing
invoice.

### `POST /v1/checkout` — scope `payment:create`

```json
{
  "invoice_id": "inv_01J...",
  "return_url": "https://hostelhub.com/billing/return",
  "metadata": { "subscription_id": "sub_123" }
}
```

**Note there is no `amount` field.** The server reads it from the invoice.
A client-supplied amount would be a vulnerability.

```json
{
  "session_id": "cs_live_8f7d92a1...",
  "checkout_url": "https://payment.softmato.com/checkout/cs_live_8f7d92a1...",
  "expires_at": "2026-08-12T11:00:00Z",
  "allowed_providers": ["fonepay", "esewa", "khalti"]
}
```

Server steps, in order: authenticate → check scope → validate → verify invoice
ownership → recompute amount → compute `allowed_providers` by amount → create
session (32+ bytes CSPRNG, 30-minute expiry).

### `GET /v1/transactions/:id` — scope `payment:read`

Returns status, amounts, fee, provider, timestamps. Scoped to the caller's own
application. This is the endpoint a SaaS uses to answer "is TXN-123 paid?"
rather than deciding for itself.

### `POST /v1/refunds` — scope `refund:request`

Creates a request only. A SaaS can never approve a refund; approval happens in
the admin panel.

---

## 4. Outbound webhooks

```
POST <application.webhook_url>
X-Softmato-Signature: <hex hmac-sha256 of "{timestamp}.{body}">
X-Softmato-Timestamp: 1754990400
```

```json
{
  "event": "payment.success",
  "transaction_id": "TXN-2082/83-00000001",
  "invoice_id": "HH-2026-00123",
  "amount": 1200000,
  "currency": "NPR",
  "status": "SUCCESS",
  "occurred_at": "2026-08-12T10:30:00Z"
}
```

Events: `payment.created`, `payment.pending`, `payment.success`,
`payment.failed`, `payment.cancelled`, `payment.expired`,
`payment.refund_created`, `payment.refunded`, `payment.partially_refunded`.

Consumers must verify the signature with `crypto.timingSafeEqual` and reject
timestamps older than 5 minutes. Document this in the SDK.

Delivery via QStash with exponential backoff. After 8 failures → `abandoned`
plus an admin alert. Always replayable from the admin panel.

---

## 5. Provider integrations

Adapter interface:

```ts
interface PaymentProvider {
  id: 'fonepay' | 'esewa' | 'khalti';

  initiate(session: PaymentSession): Promise<{
    providerRef: string;
    redirectUrl?: string;
    deeplink?: string;
    qrPayload?: string;
    correlationId?: string;
  }>;

  handleCallback?(raw: unknown, headers: Headers): Promise<VerifiedResult>;
  poll(txn: Transaction): Promise<VerifiedResult>; // mandatory
  cancel?(txn: Transaction): Promise<void>;
  refund?(txn: Transaction, amountMinor: bigint): Promise<RefundResult>;
}

type VerifiedResult = {
  status:
    'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired' | 'refunded';
  grossAmountMinor: bigint;
  providerFeeMinor: bigint;
  providerTxnId?: string;
  raw: unknown;
};
```

`poll()` is mandatory for every provider. It is the universal safety net and,
for Khalti, the only confirmation path.

---

### 5.1 `manual_qr` — **removed 2026-08-16**

A customer transferring by bank QR and uploading a screenshot for an admin to
approve. **Deleted**, reversing the 2026-08-12 decision that made it
first-class. Every payment now goes through a gateway; nothing is credited on
a person's say-so.

Two consequences worth stating plainly, because neither is solved by the
removal itself:

- **There is no fallback when a gateway is down.** That was this provider's
  other job.
- **Nothing can currently take a payment.** `manual_qr` was the only provider
  needing no external credentials, so until Fonepay, eSewa or Khalti has both
  credentials and an adapter, `allowed_providers` comes back empty and
  checkout refuses every session.

The section number is kept so that references to §5.2–§5.4 elsewhere in the
docs and in code comments stay correct.

---

### 5.2 Khalti (KPG v2)

**Khalti does not push webhooks.** Confirmation is redirect-then-lookup plus
scheduled polling.

- Sandbox `https://dev.khalti.com/api/v2/`
- Production `https://khalti.com/api/v2/`
- Auth: secret key in the `Authorization` header.
  **Verify the exact prefix (`key ` vs `Key `) against live docs on first
  integration — published examples differ.**

**Initiate** — `POST /epayment/initiate/`

```json
{
  "return_url": "https://payment.softmato.com/checkout/<session_id>/return",
  "website_url": "https://softmato.com",
  "amount": 1200000,
  "purchase_order_id": "<session_id>",
  "purchase_order_name": "HostelHub Standard",
  "customer_info": { "name": "...", "email": "...", "phone": "..." }
}
```

Returns `pidx` and `payment_url`. Store `pidx` as `provider_ref`; redirect to
`payment_url`.

**Verify** — `POST /epayment/lookup/` with `{ "pidx": "..." }`. Response
includes `status`, `total_amount`, `transaction_id`, `fee`, `refunded`.

| Khalti          | Ours        |
| --------------- | ----------- |
| `Initiated`     | `created`   |
| `Pending`       | `pending`   |
| `Completed`     | `succeeded` |
| `Refunded`      | `refunded`  |
| `Expired`       | `expired`   |
| `User canceled` | `cancelled` |

**Only `Completed` is success.** Take `fee` directly into `provider_fee_minor`.
Payment links expire after 60 minutes, so session TTL must be ≤ 30 minutes.

The return URL carries `status=Completed` in the query string. **It is
forgeable. Ignore it entirely** except as a trigger to run `poll()`.

Refunds are supported via API.

---

### 5.3 eSewa

Two flows — detect and route:

```ts
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
const isTouchDevice = navigator.maxTouchPoints > 0;
const isSmallScreen = window.innerWidth <= 768;
const useIntent = isMobileUA && isTouchDevice && isSmallScreen;
```

Mobile → **Intent** (deeplink into the eSewa app). Desktop → **ePay** (signed
form POST redirect).

**Signature** — HMAC-SHA256, base64-encoded, over a comma-joined string whose
fields and order come from `signed_field_names`:

```
product_code=INTENT,amount=100,transaction_uuid=txn-20251220-001
```

Development access key, published by eSewa:
`LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==`

**Intent endpoints** (sandbox base `https://rc-checkout.esewa.com.np`):

| Purpose | Endpoint                                 |
| ------- | ---------------------------------------- |
| Book    | `POST /api/client/intent/payment/book`   |
| Status  | `POST /api/client/intent/payment/status` |
| Cancel  | `POST /api/client/intent/payment/cancel` |

Book returns `booking_id`, `deeplink`, `correlation_id`. Store `booking_id` as
`provider_ref`, `correlation_id` as `provider_correlation_id`.

**Callback** — eSewa POSTs a signed payload containing `product_code`, `amount`,
`reference_code`, `correlation_id`, `status`, `signature`,
`signed_field_names`. Verify the signature first, before anything else.

If no callback arrives within 5 minutes, poll the status endpoint.

| eSewa      | Ours        |
| ---------- | ----------- |
| `BOOKED`   | `created`   |
| `PENDING`  | `pending`   |
| `SUCCESS`  | `succeeded` |
| `FAILED`   | `failed`    |
| `CANCELED` | `cancelled` |
| `REVERTED` | `refunded`  |

Mobile SDKs are deprecated — do not use them.

---

### 5.4 Fonepay

Onboarded through the acquiring bank, not self-serve. Likely the highest-value
rail: businesses pay from bank accounts, and wallet limits can block larger
subscription amounts.

- PG redirect: `https://clientapi.fonepay.com`
- Dynamic QR: `https://merchantapi.fonepay.com`
- Auth: merchant code + shared secret, HMAC hash verification

Build the adapter shell with `poll()`. Leave `initiate()` behind a feature flag
until credentials and the bank's integration document arrive.

**Do not guess at Fonepay request shapes. Ask.**

---

## 6. Confirmation paths

**Callback handler** — must be fast:

```
1. Read raw body
2. Verify signature — reject immediately if invalid
3. INSERT into provider_events (unique constraint dedupes replays)
4. Enqueue to QStash
5. Return 200
```

Target under 200ms. Never process inline — providers time out and resend.

**Polling job** — every minute:

```sql
SELECT * FROM transactions
WHERE status IN ('created','pending')
  AND next_poll_at <= now()
ORDER BY next_poll_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

Call `poll()`, record a `provider_events` row, apply the result. Exponential
backoff. After `poll_timeout_sec`, mark `expired`.

**Processing a verified success** — one database transaction:

```
SELECT … FOR UPDATE the transaction
already succeeded? → return (idempotent no-op)
amount mismatch?   → reconciliation_required, alert, STOP
update transaction (status, fee, net, provider_txn_id, succeeded_at)
postJournal(...)                    ← CHART_OF_ACCOUNTS.md §9.2 or §9.3
store journal_id on the transaction
update invoice paid_minor and status
insert webhook_deliveries row
insert audit_logs row
```

---

## 7. Rate limits

| Endpoint            | Limit                             |
| ------------------- | --------------------------------- |
| `POST /v1/checkout` | 60/min per application            |
| `GET /v1/*`         | 300/min per application           |
| Provider callbacks  | 600/min per IP                    |
| Admin login         | 5 per 15 min per IP, then lockout |
| Contact form        | 3/hour per IP                     |

Upstash Redis. Return 429 with `Retry-After`.

---

## 8. Amount-based provider routing

`allowed_providers` is computed per session, never static:

```ts
const allowed = await db.query.paymentProviders.findMany({
  where: and(
    eq(isActive, true),
    lte(minAmountMinor, amount),
    or(isNull(maxAmountMinor), gte(maxAmountMinor, amount)),
  ),
});
```

Wallets have per-transaction limits. A customer must never select a method that
will fail mid-payment.

**Provider preference.** Fonepay is the primary integration — a full merchant
account reaching banks and wallets rather than one wallet's customers. eSewa
and Khalti are secondary. `sort_order` encodes that (10 / 20 / 30) and decides
the order a customer sees once the amount filter above has run.

Note that the query filters on `is_active`, so **a provider without live
credentials is not offered at all.** Activating a provider is part of the
change that lands its adapter and its credentials — never before, or a customer
is shown a method that fails when they try to pay.

---

## 9. Receipts

**A confirmed payment sends the payer a receipt.** Not the SaaS — the person
whose money moved. The SaaS learns about the payment from the webhook (§4);
these are different audiences and different messages.

A receipt is a rendering of a succeeded transaction, not a record of its own.
There is no receipts table and no separate receipt sequence: `txn_no` is the
receipt number, and it is already gapless per fiscal year.

| Field       | Source                                                     |
| ----------- | ---------------------------------------------------------- |
| Receipt no. | `transactions.txn_no`                                      |
| Invoice no. | `invoices.invoice_no`                                      |
| Amount      | `gross_amount_minor` — what left the customer's account    |
| Paid with   | `payment_providers.display_name`                           |
| Reference   | `transactions.provider_ref`, to match against a statement  |
| Date        | `succeeded_at`                                             |

Three rules govern it:

1. **The amount is the gross, never the net.** The provider's fee is our cost,
   not a deduction from what the customer paid. A receipt quoting the net would
   understate what they are owed if the payment is later refunded.
2. **Sending can never fail the payment.** The receipt goes out after the
   journal is posted and the invoice cleared, through a sender that does not
   throw. An email problem must not roll back confirmed money.
3. **A payer with no email address is normal**, not an error. A SaaS is not
   obliged to give us one; the payment completes and there is simply nowhere to
   send the receipt.

⚠ **Open with the accountant:** whether Nepali practice requires a distinct
receipt series alongside the invoice series. If it does, this grows a number
and a table. Recorded in `MEMORY.md`.

# Integrating with Softmato Payments

## Who this is for

**This is the internal integration guide for Softmato's own SaaS product
teams** — HostelHub, QuestionCall, and the products that follow. Every
application on this API is a Softmato product, credentials are issued by us to
us, and the invoices raised through it carry Softmato's name and PAN.

If you have arrived here from outside the company, this is not a self-service
API and there is no sign-up form. **We are not currently open to third-party
integrations.** That is an accounting decision rather than a technical one, and
the reasoning is written down in `future_implementation.md` §2.

**Building something that needs to take payments in Nepal? We will build it
for you.** That is the agency side of the business, and it is the right way in
— you get the same payment rail described below, wired up properly, without
having to integrate anything yourself. Start at
[softmato.com/contact](/contact).

---

For a Softmato product team, then: you do not integrate eSewa or Khalti; you
integrate us once.

Reference material, in the order you will need it:

- [`API.md`](./API.md) — every endpoint, every field, the webhook contract
- `@softmato/sdk` — the typed client; zero runtime dependencies

---

## Installing the SDK

`@softmato/sdk` is published to **GitHub Packages**, privately, under the
`softmato` organisation. It is not on public npm, so `pnpm add @softmato/sdk`
on its own will 404 until the scope is pointed at the right registry.

**1. Route the `@softmato` scope.** An `.npmrc` beside your `package.json`:

```
@softmato:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Commit it. There is no secret in that file — `${GITHUB_TOKEN}` is expanded from
the environment when npm reads it, which is exactly why it is written as a
variable and not pasted.

**2. Give it a token.** A GitHub personal access token (classic) with the
**`read:packages`** scope, exported as `GITHUB_TOKEN`. In GitHub Actions the
job's own token is already enough:

```yaml
- run: pnpm install
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

On Vercel, set `GITHUB_TOKEN` as an environment variable on the project so the
build can install.

**3. Install.**

```bash
pnpm add @softmato/sdk
```

Two failures worth telling apart: a **401** means the token is missing or has
no `read:packages` scope; a **404** means the token is valid but the account
cannot see the `softmato` organisation, which is an access problem rather than
a registry one.

### It is server-side only

The SDK imports `node:crypto`, so it will not run in a browser or a React
Native bundle — deliberately. Every call it makes carries the client secret,
and anything shipped to a device is public. Import it in route handlers, server
actions and jobs; never in a component that reaches the client.

### If you would rather not install anything

The SDK is a convenience, not a requirement — `/api/v1` is plain HTTP and
`API.md` documents every field. But it does three things whose failure modes
are expensive, and a hand-rolled client has to do all three: it generates an
`Idempotency-Key` when you forget one (the cost of forgetting is a **second
charge**, not an error), it retries only what is safe to retry, and it verifies
webhook signatures against the raw body before parsing it.

---

## 1. What each side owns

|                                                   | Softmato | You |
| ------------------------------------------------- | -------- | --- |
| Gateway integration, credentials, settlement      | ✅       |     |
| Invoice numbering, the ledger, the PDF            | ✅       |     |
| Receipts and their delivery                       | ✅       |     |
| Refund **approval**                               | ✅       |     |
| Who your customer is, and what plan they bought   |          | ✅  |
| Describing the plan to the customer               |          | ✅  |
| Provisioning once you are told money arrived      |          | ✅  |
| Deciding _when_ a customer should be billed       |          | ✅  |
| Telling the customer a bill is coming, or overdue |          | ✅  |
| Chasing, grace periods, suspension                |          | ✅  |

The line to remember: **we own the money and the documents, you own the
product and the relationship.** Everything below follows from it.

### We do not email your customer before a payment

The one message Softmato sends a customer is the **receipt**, after money has
arrived, with the PDF attached. Nothing goes out before that — no "your
renewal is due", no reminder, no overdue notice.

That is on purpose. It is your customer, your brand and your tone of voice, and
a second company writing to them about money they have not yet paid is at best
confusing. So the notices are yours to send — and the document to put in them
is ours to produce: ask us for the invoice (§2.4) and attach the PDF, or link
to it. You get the same document we would have sent, without a second sender
appearing in their inbox.

The same split applies either side of the payment: **you track what is coming
and what has lapsed; we record what was billed and what was received.**

---

## 2. The happy path, in four calls

```ts
import { SoftmatoClient, verifyWebhook } from '@softmato/sdk';

const softmato = new SoftmatoClient({ secret: process.env.SOFTMATO_SECRET! });
```

### 2.1 Raise an invoice

```ts
const invoice = await softmato.createInvoice({
  external_ref: 'HH-2026-00123', // your order id
  customer: { external_ref: 'cust_88', name: 'Ram Sharma', email: '…' },
  lines: [
    {
      description: 'Growth — 12 months',
      quantity: 1,
      unit_price_minor: 2000000,
    },
  ],
  service_starts_at: '2026-08-25T00:00:00Z',
  service_ends_at: '2027-08-24T00:00:00Z',

  // What you are selling, in your words. See §3.
  presentation: {
    plan_name: 'HostelHub Growth — Annual',
    tagline: 'For properties running more than one building.',
    features: [
      'Up to 500 beds across unlimited properties',
      'Nightly off-site backups, restorable to any point in 30 days',
    ],
    highlights: ['Priority support'],
    billing_period: '12 months',
  },
});
```

`unit_price_minor` is **paisa**, always an integer. NPR 20,000 is `2000000`.
There are no floats anywhere in this API, in either direction.

`external_ref` is unique to your application, and **a repeat returns the
invoice you already have** rather than raising a second one. That is what makes
this safe to call from a retry.

### 2.2 Send the customer to pay

```ts
const { checkout_url } = await softmato.createCheckout({
  invoice_id: invoice.invoice_id,
  return_url: 'https://yourapp.com/billing/return',
});
```

**There is no amount parameter.** We read it from the invoice. A
client-supplied amount would let anyone who can call your endpoint choose their
own price.

Redirect the customer to `checkout_url`. They see your plan on the left and the
payment methods on the right; they never leave with our branding claiming to be
yours, and they never hand us a card number — the gateway takes it on its own
page.

### 2.3 Learn that they paid

Two channels, and you should use both:

**The webhook** tells you _when_ to act.

```ts
const raw = await request.text(); // the RAW body — see below

const result = verifyWebhook({
  secret: process.env.SOFTMATO_WEBHOOK_SECRET!,
  body: raw,
  signature: request.headers.get('x-softmato-signature'),
  timestamp: request.headers.get('x-softmato-timestamp'),
});

if (!result.valid) return new Response('invalid', { status: 400 });
if (result.payload.event === 'payment.success') await provision(result.payload);

return new Response('ok'); // 2xx stops the retries
```

Three ways to get this wrong, all of them common:

1. **Verifying a re-serialised body.** The signature covers the exact bytes we
   sent. `JSON.stringify(req.body)` after your framework parsed it is a
   _different_ string, and it will fail for genuine deliveries. In Express use
   `express.raw({ type: 'application/json' })` on this route; in Next, `await
request.text()`.
2. **Asserting the headers are present.** `headers.get()` returns `null` when
   a header is absent, and an absent signature is the _normal_ case for the
   unauthenticated traffic that finds a public endpoint. Pass it through as-is;
   the SDK types admit `null` and answer `missing_signature`. Do not write `!`.
3. **Skipping the age check.** The SDK does it for you: a delivery older than
   five minutes is rejected, which is what stops a captured request being
   replayed. If you verify by hand, do the same.

**A server-side read** is the authority. Never decide from a return URL's query
parameters — those are a claim made by whoever's browser made the request.

```ts
const txn = await softmato.getTransaction('TXN-2083/84-00000008');
```

### 2.4 Show the customer their records

We email a receipt PDF automatically. To put the history in _your_ settings
screen:

```ts
const detail = await softmato.getInvoice('INV-2083/84-000010');
const receipt = await softmato.getReceipt('TXN-2083/84-00000008');

// …and the file itself, to attach or offer as a download
const file = await softmato.downloadDocument({ invoice: 'INV-2083/84-000010' });

if (file.contentType !== 'application/pdf') {
  // The PDF engine was unavailable and we sent the HTML rendering instead.
  // Saving this as `.pdf` gives your customer a file that will not open.
  console.warn(file.pdfFallbackReason);
}
```

`detail.presentation` is the plan copy you sent, echoed back — so your billing
screen and our invoice describe the purchase identically without you keeping a
second copy in sync.

---

## 3. Sending your plan details

The `presentation` block is optional, and it is the one place in this API where
your own words reach a customer through us. The full rules are in
[`API.md` §3](./API.md); the short version:

- Plain text. No HTML, no Markdown.
- 8 features max (120 chars each), 3 highlights max (60 chars each).
- **No prices, anywhere.** `NPR 5,000`, `Rs. 5000` and `5,000/-` are rejected
  by the API. The amount is stated once, by us, from the invoice. A feature
  line quoting a different figure is a billing dispute you will lose.
- No promises about payment, refunds, or Softmato. Our refund policy is linked
  from the checkout page; a bullet promising a different one creates an
  obligation you cannot settle on our behalf.
- Omit it and nothing renders. We do not invent a plan name for you.

It is **presentation, never arithmetic** — nothing in it can change what is
charged. That is the only reason we can print integrator-supplied text on a
statutory document at all.

---

## 4. Things that will bite you

**A payment gateway answers "did the customer pay?" — not "is this order
valid?"** Check entitlements on your side before raising the invoice, not after
the money lands.

**An invoice number is not proof of payment.** `INV-2083/84-000125` can sit
unpaid forever and that is a valid record. Provision on `payment.success` or on
a `getTransaction` that says `succeeded`, never on the existence of an invoice.

**A webhook can arrive twice.** Deliveries are retried until you answer 2xx, so
your handler must be idempotent. Key on `transaction_id`.

**"The customer cancelled" is an answer, not a failure.** You will receive
`payment.cancelled`. Leave the invoice open and let them retry; a new payment
against the same invoice is the normal path.

**Document numbers contain a slash.** `INV-2083/84-000010` is the fiscal year
and the sequence. Send it as path segments — the SDK does this for you. A
percent-encoded `%2F` is decoded inconsistently by proxies and can arrive as a
different identifier than the one you asked for.

**Amounts are integer paisa, everywhere.** If you find yourself writing
`amount / 100` before sending, you are about to lose a rounding argument with
an accountant.

---

## 5. Recurring billing — the recommended pattern

Everything in this section is a **recommendation, not a requirement.** Nothing
here is enforced by the API, and a SaaS with a good reason to bill differently
is free to. It is written down because it is the pattern Softmato has found
works for Nepali customers, and because a SaaS billing under our name is
billing under our reputation — a customer who is surprised by a charge does not
distinguish between the two companies on the invoice.

One rule in it is not really optional, and it is marked as such.

### Bill early, collect on click

An invoice and a payment link are different things with different lifetimes.

**An invoice can be raised whenever you like.** Give it a `due_at` in the
future and a `service_starts_at` / `service_ends_at` covering the period it
pays for; we account for it correctly as revenue not yet earned, and the
document says which period it covers.

**A checkout session lives 30 minutes.** It is closer to a cheque than to a
link: long-lived, it can be forwarded, reused, or paid after the price changed.
So do not mint one in advance. Show the customer their outstanding invoice in
your own UI, and create the session at the moment they press Pay — every time,
including retries.

### The 7 / 7 shape

|                                         |                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| **7 days before** the new period starts | Raise the renewal invoice. Email your customer that it is ready, with our PDF |
| **Day the period starts**               | `due_at`. The customer has had a week's notice                                |
| **7 days after**                        | Grace. Service keeps working. Remind them                                     |
| **After that**                          | Suspend, at your discretion                                                   |

Two weeks of runway around every renewal, and nobody loses service on a day
they did not expect.

Seven, rather than some other number, for a concrete reason: **Nepali wallets
have no auto-debit.** No one can charge a saved card on your behalf; the
customer must open a wallet and act. Notice is therefore not a courtesy, it is
the collection mechanism. A bill raised on the morning it is due will be paid
late, and the lateness is your design, not their negligence.

### Make `external_ref` contain the period — this one is not optional

A nightly renewal job will, sooner or later, run twice: a retry, a crash
halfway, two workers, a manual re-run. If each run makes a new invoice, one
customer is billed twice for one month, and they will find out before you do.

`external_ref` is unique per application, and **a repeat returns the invoice we
already have rather than creating another** (`created: false` on the response).
That makes double-billing impossible — but only if the reference identifies the
_period_, not the moment the job ran.

```ts
// Right — deterministic. The same month can only ever produce one invoice.
external_ref: `sub_${subscriptionId}:2083-09`;

// Wrong — a new reference on every run, and a new invoice with it.
external_ref: `renewal-${Date.now()}`;
```

Everything else in this section is advice. This is the one we would ask you to
treat as a rule.

### While the invoice is open

- **Do not provision on it.** An unpaid renewal invoice is a valid record that
  can sit there forever. Keep the customer on their current period until
  `payment.success` arrives.
- **Let them pay it late.** A new checkout session against the same invoice is
  the normal path, not an error.
- **Cancel by voiding, not by ignoring.** If the customer cancels during the
  notice week, ask us to void the invoice. An abandoned open invoice is
  indistinguishable from an unpaid one in both our books and yours.
- **A part payment is a real state.** The invoice reports `partially_paid` with
  a balance; do not treat it as unpaid.

### Fetching the document for your emails

`getInvoice()` gives you JSON to render your own screen from, and the same
invoice as HTML or PDF to attach (§2.4). Check `contentType` before you name
the file — a deployment with no PDF engine answers with a complete, printable
HTML document and a header saying so, and an HTML body saved as `.pdf` is a
file your customer's reader refuses to open.

---

## 6. Connecting securely

Everything in this section is enforced by the platform. None of it is advice:
each rule below is a request that gets refused, so a mistake here shows up as
an error rather than as a quiet weakness.

### 6.1 The secret is server-side, always

`client_secret` goes in `Authorization: Bearer`, from your server, and nowhere
else. Never in a browser bundle, a mobile app, a repository, or a URL. Anything
shipped to a device is public no matter what it is called — a secret in a
minified bundle is a secret that has been published, slowly.

It is stored here as an argon2id hash, so we cannot read it back to you. A lost
secret is **rotated**, not recovered.

### 6.2 Register your domains before you use them

An application may only send customers to, and receive webhooks on, hostnames
that have been registered against it in advance. The list is set by Softmato,
signed in — it is never taken from a request, because an allowlist a caller can
add to is not an allowlist.

- `return_url` on `POST /v1/checkout` must be **https** and on a registered
  hostname. Otherwise the call is refused with `422 VALIDATION_FAILED`, and the
  `detail` field names the hostname that was rejected.
- `webhook_url` must be on a registered hostname too. That URL is fetched by
  our server, so an address we have not been told to trust is not one we will
  call.

Matching is **exact**. Registering `questioncall.com` does not allow
`app.questioncall.com`, and it certainly does not allow
`evilquestioncall.com` — there are no wildcards, by design. List every host a
customer can land on: apex, `www`, and any `app` or `api` subdomain. Over-list
rather than be locked out on launch day; removing one later takes a second.

A `422` naming a host you own means it is not on the list yet. Ask us to add
it — you cannot add it yourself, and that is the point.

### 6.3 Verify the webhook signature before reading any field

Every delivery carries `X-Softmato-Signature` and `X-Softmato-Timestamp`.
Verify the signature against your **webhook signing secret** before you parse
the body, branch on it, or log it. An unverified webhook body is a string a
stranger chose.

The signing secret is not the client secret. They are different credentials and
neither works in the other's place:

|                        | Proves      | Direction | Readable later  |
| ---------------------- | ----------- | --------- | --------------- |
| `client_secret`        | you are you | you → us  | no, hashed      |
| webhook signing secret | we are us   | us → you  | yes, on request |

`verifyWebhook()` in `@softmato/sdk` does this correctly, including the
timestamp window. Use it rather than writing the comparison yourself.

### 6.4 Provision on a verified payment, and nothing else

Turn the customer's service on when a `payment.success` webhook verifies, or
when a `getTransaction()` call you made says the payment succeeded.

Never on any of these:

- an invoice existing — an invoice is a request for money, not money;
- the customer arriving at your return URL — they get there by clicking, and
  they can get there without paying;
- a query parameter on that return URL. **There is no payment status in it.**
  We do not put one there, and if you find one it did not come from us.

### 6.5 Rate limits

`/api/v1` is rate limited per IP at the edge. A refused request gets `429` and
never reaches the API, so it is cheap for you to retry and cheap for us to
deny. Back off rather than retrying immediately, and use one connection pool
rather than a burst of parallel calls.

### 6.6 Rotation

Rotating a client secret issues a new one and keeps the old one working for
**24 hours**, so you can deploy without a window of `401`s. Deploy inside that
window; the old secret stops at the end of it whether or not you did.

Rotating a **webhook signing secret** has no overlap — two valid signing keys
would mean your consumer accepting a signature from the key we meant to
retire. Deliveries fail until you redeploy, and the retry job replays them once
you have.

Revocation is immediate and cannot be undone. A revoked application needs a new
one.

---

## 7. Going live

1. Send us **every production hostname** a customer can land on — apex, `www`,
   and any `app` or `api` subdomain — plus the host your webhook endpoint sits
   on. They are registered against your application before it is issued (§6.2),
   and until one is registered no `return_url` on it will be accepted.
2. Test against sandbox credentials until the whole loop works — invoice,
   checkout, a real sandbox payment, the webhook, the receipt.
3. Point `webhook_url` at your production endpoint and verify a delivery lands
   and verifies **before** you switch keys.
4. Ask us for live credentials. Both secrets are issued once and shown once.
5. Run one small real transaction end to end and check it against your own
   records before you send customers to it.

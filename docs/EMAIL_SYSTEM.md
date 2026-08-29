# EMAIL_SYSTEM.md — How mail leaves the building

**Provider:** Resend · **Strategy:** immediate, no batching or digesting.

Sections 1–3 are the infrastructure: which mailbox a message comes from, where
a reply to it lands, and where each of those is configured. Section 5 is the
register of triggers — every email the platform sends, and what is in it.

---

## 1. The shared Softmato domain

Softmato owns one verified sending domain, and every product the company runs
shares it:

```
                    softmato.com
                         |
                  DNS managed by Vercel
                         |
          +--------------+--------------+
          |                             |
        Resend                       ImprovMX
      SEND (outbound)             RECEIVE (inbound)
          |                             |
          |                             v
          |                   work.softmato@gmail.com
          v
   info@ alert@ billing@ security@ support@ noreply@
```

Two consequences the code depends on:

- **The domain is verified as a whole.** Any local-part on it can send without
  its own verification. Adding a mailbox to send _from_ costs nothing and needs
  no DNS change.
- **Sending and receiving are separate systems.** A Resend sender address does
  not create an inbox. A reply only reaches a person if that same address also
  exists as an **ImprovMX forwarding alias** to `work.softmato@gmail.com`.

Never point the root MX records at a second receiving provider, and never
delete Resend's DKIM/SPF/return-path records. Both are DNS changes made in
**Vercel**, not at the registrar.

---

## 2. Categories — which mailbox a message comes from

Because local-parts are free, the local-part carries meaning. A customer who
sees `alert@` in their inbox knows before opening it that this one is not a
receipt.

| Category   | Mailbox     | Sender reads as   | What it carries                                          |
| ---------- | ----------- | ----------------- | -------------------------------------------------------- |
| `info`     | `info@`     | Softmato          | Ordinary product mail — notices, confirmations           |
| `alert`    | `alert@`    | Softmato Alerts   | Needs attention now — a failed payout, a gateway down    |
| `billing`  | `billing@`  | Softmato Billing  | Money — invoices, receipts, reminders, refunds           |
| `security` | `security@` | Softmato Security | Credentials and account safety — codes, resets, logins   |
| `support`  | `support@`  | Softmato Support  | Mail a person will reply to — enquiries, support threads |
| `noreply`  | `noreply@`  | Softmato          | Machine mail with nothing to say back to                 |

The split is by **what the message is**, not by which module sent it: a payment
gateway going down is an `alert` although it comes out of payments, and a
password reset is `security` although auth also sends ordinary `info` mail.

`categories.ts` holds these tables; `identity.ts` assembles the header from
them. The sender name is stripped of `"\,;<>` before it is interpolated —
that field is editable from the admin panel, and without stripping, whoever can
edit settings could append `<attacker@evil.test>` and rewrite the envelope of
every email the company sends. It is stripped _before_ the fallback to
`Softmato`, not after: a name of `"<>` is truthy, so checking for emptiness
first lets it through and then sanitises it down to a bare address with no
branding at all.

### 2.1 Where replies go

Sending from a mailbox does not make it able to _receive_ — that needs an
ImprovMX forwarding alias per address. So `From` and `Reply-To` answer
different questions, and only one of them has to be a real inbox.

Every category except `noreply` carries **`Reply-To: info@<domain>`** unless an
explicit address is configured. That is derived from the sending domain at send
time, so it can never point somewhere unowned, and it means **one alias
(`info@`) is enough to make every reply in the product reach a human.**

`noreply` carries no `Reply-To` at all — that is the whole meaning of the
category.

> `company.support_email` is deliberately **not** consulted here. It is a
> contact detail printed in the SLA and the site footer, chosen for humans to
> read, and it ships blank. Borrowing it as a routing address is how a product
> ends up sending flawlessly while every reply bounces — Resend reports success
> either way, and the failure surfaces days later in someone else's inbox.
> `replyToFor()` owns this, with tests.

**Inbound aliases to create in ImprovMX:** `info@` is the one that matters — it
catches every reply. Add `support@` and `billing@` only to catch mail sent
_directly_ to those addresses, from a business card or the footer; replies do
not need them. `alert@`, `security@` and `noreply@` are outbound-only by design.

---

## 3. Where the sender is configured

| Piece                   | Lives in                 | Why                                                                                       |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| Sending domain          | `EMAIL_DOMAIN` env       | Must match what Resend verified. A typo in a settings form would silently stop all email. |
| Display name            | Admin → Settings → Email | Branding. Falls back to `Softmato`.                                                       |
| Reply-to                | same                     | Falls back to `info@<domain>` — **not** to the public support email. See §2.1.            |
| Local-part per category | same                     | Which mailboxes exist is the founder's decision. Falls back to the table above.           |

Every configurable field may be left blank; blank means "use the fallback", so
an empty settings table sends correctly branded mail from the right mailboxes
without anyone opening the settings page.

`resolve-identity.ts` reads them. It **never throws** — a settings table that
is unreachable must not stop an alert going out, so a failed read degrades to
the shipped identity. It has no cache of its own: `getSettings()` is memoised
per request, so a page that sends three emails makes one query. A loop outside
a request pays one read per message, which is the right trade while sends are
counted in tens; revisit it, with a TTL, the day a broadcast is counted in
thousands.

---

## 4. Template structure

Templates are plain TypeScript functions returning `EmailTemplate`
(`{ category, subject, html, text }`) — no React Email, no Handlebars, no
runtime template resolution by name.

```
apps/web/lib/email/
  categories.ts        # the category type and its tables
  identity.ts          # From / Reply-To assembly — pure, unit tested
  resolve-identity.ts  # env + settings → the live identity
  client.ts            # the Resend client
  send.ts              # sendEmail() — the only thing that talks to Resend
  html.ts              # layout / paragraph / escapeHtml
  templates/
    contact-enquiry.ts
    payment-receipt.ts
```

Each template declares its own category, so a call site never names one:

```typescript
// apps/web/lib/email/templates/payment-receipt.ts
return { category: 'billing', subject: `Payment received — ${amount}`, ... };

// the call site — handing over the template carries the category with it
await sendEmail({ to: receipt.payerEmail, template: paymentReceiptEmail(receipt) });
```

The category lives on the template because it is a property of the _message_,
and the call site is the one place that cannot see the whole message.

Rules that hold for every template:

- **`text` is not optional.** A message with no text part is a message spam
  filters distrust.
- **Interpolate every value through `escapeHtml()`.** An unescaped `<` in a
  name is not a rendering bug — it is a phishing email sent from our own domain.
- **Templates render, they do not send.** No network, no `server-only`, so they
  are unit tested directly and the provider stays swappable in `send.ts` alone.

`sendEmail()` never throws: a business flow must not fail because delivery did.
It returns `{ sent: false, reason }`. With no `RESEND_API_KEY` — local
development and CI — it reports `NOT_CONFIGURED` and sends nothing.

**Anything that must not be lost belongs in the database first and here
second, never here alone.**

---

## 5. Triggers

### 5.1 Contact enquiry

**Trigger:** a visitor submits the contact form (docs/PRD.md §5.1)
**Recipient:** `COMPANY_EMAIL`
**Template:** `contact-enquiry` · **Category:** `support`
**Subject:** `Contact: <subject>`, or `Contact from <name>`

**Reply-to is overridden to the enquirer's address** — this is the one case
where the derived `info@` is wrong, because a reply is meant to reach the
person who wrote in, not to come back to us.

The enquiry is written to the database _before_ this is attempted, and a failed
send is logged rather than surfaced: the visitor is told the message arrived,
because it did. An unconfigured provider costs a notification, never an enquiry.

### 5.2 Payment receipt

**Trigger:** `completePayment()` confirms a payment (docs/API.md §6)
**Recipient:** the payer, when the SaaS product gave us an address
**Template:** `payment-receipt` · **Category:** `billing`
**Subject:** `Payment received — <amount> (<receipt no>)`

The amount is the **gross** — what left the customer's account. The provider's
fee is our cost, not a deduction from what they paid, and a receipt quoting the
net would understate what they are owed if the payment is ever refunded.

A payer with no email address is a normal case, not an error. By the time this
runs the money has moved and the journal is posted, so a delivery failure is
logged and nothing more — letting it escape would roll back a confirmed payment
over an email, turning a delivery problem into an accounting one.

---

## 6. Adding a trigger

1. Write the template under `templates/`, returning `EmailTemplate` with the
   category the _message_ is — not the one the sending module is.
2. Escape every interpolated value; write the `text` part.
3. Add a case to `apps/web/tests/email-templates.test.ts`, including the
   escaping case if any field is user-supplied.
4. Add it to §5 above.

Do not add a category. The six are the vocabulary; a seventh means the split
has stopped being about what the message is.

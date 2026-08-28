# PRD — Softmato Platform

## 1. The company

**Softmato Technology Pvt Ltd** is a Nepali software company operating from
Kathmandu. It has two revenue lines:

- **SaaS products** it owns and operates — HostelHub, QuestionCall, more to come
- **Agency work** — websites, apps, and design for external clients

**Legal shape, and why it matters to the build:**

- One legal entity. Every SaaS product is a _brand_, not a subsidiary.
- Softmato collects **its own revenue** from business customers. It never holds
  or routes money belonging to anyone else. HostelHub is sold to hostel owners
  as a subscription; students never pay through this system.
- PAN-registered, **not VAT-registered**. No VAT on invoices, no IRD CBMS
  integration. Track annual turnover and warn as the VAT threshold approaches.
- Fiscal year runs **Shrawan 1 – Ashad end** (Bikram Sambat).
- Currency is **NPR only**. The schema is currency-aware for the future; build
  NPR alone.

Because there is one entity, there is **no inter-company platform fee**. A fee
charged from one product to another would net to zero. Product-level profit is
reported through a dimension on ledger lines, not through internal invoicing.

---

## 2. The problem

Today, payment collection is manual:

1. Customer scans a static QR code
2. Customer pays and sends a screenshot as proof
3. A founder opens the eSewa app and verifies it by hand
4. A founder marks the account paid
5. The customer's service starts

This doesn't scale, has no audit trail, produces no books, and gives no view of
revenue per product. Each new SaaS would otherwise need its own eSewa and
Khalti integration, its own credentials, and its own reconciliation.

---

## 3. What we're building

One platform with four surfaces and one financial core.

| Surface         | Domain                 | For                              |
| --------------- | ---------------------- | -------------------------------- |
| Public site     | `softmato.com`         | Prospects, candidates, customers |
| Admin panel     | `admin.softmato.com`   | Founders only                    |
| Hosted checkout | `payment.softmato.com` | Paying customers                 |
| Client portal   | `agency.softmato.com`  | Agency clients                   |
| Payment API     | `/api/v1/*`            | The SaaS products                |

**The central idea:** SaaS products never touch a payment provider. They call
one internal API, receive a checkout URL, redirect the customer, and wait for a
signed webhook. All provider credentials, verification, refunds, fees, and
ledger entries live in the central platform. Adding a fifth SaaS means issuing
credentials, not writing another eSewa integration.

---

## 4. Users

### Founders (2–3 people, the only admin users in v1)

Need to see revenue by product, approve manual payments and refunds, issue
invoices, run the books, and reconcile against provider statements. They are
technical but not accountants. The system should make correct bookkeeping the
path of least resistance.

### SaaS product developers (currently the founders)

Need to integrate payment into a product in an afternoon: create an invoice,
request a session, redirect, handle a webhook. They should never read a
provider's documentation.

### Paying customers (hostel owners, businesses)

Nepali business owners paying a subscription. They pay by wallet or bank app,
often on mobile, sometimes on a slow connection. They need a checkout page that
is obvious, fast, and clearly identifies who they are paying and for what.

### Agency clients

External businesses who commissioned a website or app. They want to see
progress without emailing for updates.

### Public visitors

Prospects evaluating Softmato, and candidates. They need to understand what the
company does and trust it with a project.

---

## 5. Features

### 5.1 Public site

Home, Services, Products, Team, About, Blog, Careers, Contact. Legal pages:
Terms of Service, Privacy Policy, Refund & Cancellation Policy, SLA, Acceptable
Use, Cookie Policy.

**Everything is editable from the admin panel.** A founder must be able to
change any page, add a team member, or update the refund policy without a
deploy. Contact form stores to the database, emails the company, is
rate-limited, and has a honeypot.

### 5.2 Payment platform

- Register a SaaS product, issue and rotate credentials, set scopes
- Create checkout sessions server-to-server with idempotency
- Hosted checkout page showing product, invoice, amount, and available methods
- Providers: Fonepay (primary), eSewa, Khalti. A confirmed payment sends the
  payer a receipt. `manual_qr` was removed on 2026-08-16 — every payment goes
  through a gateway
- Available methods computed **by amount** — wallets have limits, and a customer
  must never pick a method that will fail mid-payment
- Verification by signed callback and/or authenticated status lookup, never by
  redirect parameter
- Explicit transaction state machine, permanent transaction IDs
- Refunds with request/approve separation
- Signed outbound webhooks with retry and replay
- Reconciliation against provider and bank records

### 5.3 Accounting

Double-entry, append-only, bank-grade. Chart of accounts tuned for a Nepali
service company. Automatic journal entries from payments, refunds, settlements,
and revenue recognition. Deferred revenue on subscriptions. TDS tracking on
agency invoices. Trial balance, P&L, balance sheet, general ledger, AR aging,
product-level P&L, period close.

### 5.4 Subscriptions

Renewal invoices, reminders at 7/3/1 days, grace period, suspension. **No
auto-debit** — Nepali wallets have no reliable server-initiated charge, so the
customer initiates each payment.

### 5.5 Client portal

Project stages, milestones, deliverables, invoices, documents, message thread.
Strict tenant isolation.

---

## 6. Success criteria

The build succeeds when:

1. A hostel owner completes a subscription payment on their phone without help
2. HostelHub is integrated in under a day using only `API.md`
3. Every rupee received appears in a balanced journal entry, automatically
4. A founder can answer "what did HostelHub earn last month, net of fees?" in
   two clicks
5. No manual verification is needed for wallet payments
6. `v_unbalanced_journals` returns zero rows, always
7. A new SaaS can start taking payments the same day it launches

---

## 7. Explicitly out of scope for v1

- Staff admin accounts and role separation _(model the shape; don't build it)_
- Payroll beyond recording salary as an expense — no TDS slab computation,
  no SSF filing
- VAT invoicing and IRD CBMS integration
- International payments and multi-currency
- Auto-debit and stored payment mandates _(table exists, unused)_
- Mobile apps
- Anything the founder has not asked for

---

## 8. Constraints

- Two or three founders build and maintain this. Prefer boring and obvious over
  clever. Every dependency is a maintenance liability.
- Free-tier infrastructure through development. Roughly $25–35/month at launch.
- eSewa and Khalti merchant accounts are pending; build against sandboxes.
- Fonepay onboarding runs through a bank and will land last.
- There is no accountant engaged yet. The chart of accounts is a working draft
  pending professional sign-off.

# Payment Integration & SaaS Billing Roadmap (`todo.md`)

This tracker outlines all implementation tasks required before and after live billing credentials/provider access are available.

---

## Phase 1: Pre-Billing & Sandbox Implementation (No Live Credentials Needed)

> Everything in this phase is built, wired, and tested end-to-end using sandbox credentials, environment variable toggles, or mocked payment responses.

### 1. UI & Admin Screens

- [x] **Payments Overview & Details Screen** (`/admin/payments`)
  - List transactions with status filters (pending, succeeded, failed, cancelled, refunded, reconciliation_required).
  - Transaction detail view showing gateway response payload, provider fees, journal link, and audit history.
- [x] **Invoices Screen** (`/admin/invoices`)
  - Invoice list, status tags (draft, issued, paid, past_due, cancelled), gapless numbering display, PDF download preview.
  - Manual & automatic invoice issuance triggers.
- [x] **Subscriptions Screen** (`/admin/subscriptions`)
  - Subscription management interface: customer tier, billing cycle, renewal status, dunning state, manual suspension/grace controls.
- [x] **Refunds & Approvals Screen** (`/admin/refunds`)
  - Refund request interface, admin approval/rejection modal, refund ledger transaction preview.
- [x] **Reconciliation & Approval Queue Screen** (`/admin/reconciliation`)
  - Interface for flagged payment mismatches, manual reconciliation overrides with audit logging.
- [x] **High-Fidelity Clean Checkout UI** (`/checkout/[sessionId]`)
  - Two-column split layout matching Softmato's white-and-emerald design system, tabular monospaced figures, smooth entrance animations, and provider tab selectors.

### 2. Database Models, API Endpoints, Admin Permissions & Audit Logs

- [x] **Database Schema Alignment**
  - Verified and aligned schema for webhooks (`outbound_webhooks`, `webhook_deliveries`), sessions, transactions, and ledger journal constraints (`payments.ts`).
- [x] **API & Webhook Callback Endpoints (`apps/web/app/api/v1/`)**
  - `POST /api/v1/webhooks/khalti` & `GET /api/v1/webhooks/khalti`: Khalti callback & lookup verification.
  - `POST /api/v1/webhooks/esewa` & `GET /api/v1/webhooks/esewa`: eSewa callback & signature verification.
  - `POST /api/v1/webhooks/fonepay` & `GET /api/v1/webhooks/fonepay`: Fonepay callback & status lookup.
- [x] **Admin Permissions & Role Guards**
  - Connected admin navigation menu links (`AdminNav`) gated by session TOTP MFA.

### 3. Payment Provider Adapters & Env Variable Controls

- [x] **Khalti Gateway Adapter (`packages/payment-core/providers/khalti.ts`)**
  - Implements `/epayment/initiate/`, `/epayment/lookup/`, `/epayment/refund/`, and sandbox fallback.
- [x] **eSewa Gateway Adapter (`packages/payment-core/providers/esewa.ts`)**
  - Implements HMAC-SHA256 signature generator/verifier, ePay form construction, callback decoding, and polling status lookup.
- [x] **Fonepay Gateway Adapter (`packages/payment-core/providers/fonepay.ts`)**
  - Implements dynamic QR payload construction, PG redirect URL generation, signature calculation, and status lookup.
- [x] **Mock Payment Gateway Adapter (`packages/payment-core/providers/mock.ts`)**
  - Deterministic adapter simulating instant succeeded, pending, failed, cancelled, and refunded flows for non-live end-to-end testing.

### 4. Production Configuration Templates & Environment Setup

- [x] **`.env.example` Update**
  - Documented payment mode, mock toggles, provider credentials, and standardized webhook callback URLs.
- [x] **Registry & Exports (`packages/payment-core/index.ts`)**
  - Registered all provider adapters for composition-time loading without heavy SDK coupling.

### 5. Local & Staging Non-Live End-to-End Testing

- [x] **Unit & Integration Test Suite (`packages/payment-core/tests/providers-sandbox.test.ts`)**
  - Test coverage for Khalti, eSewa, Fonepay, and Mock adapters across initiate, poll, callback, and refund flows.

---

## Phase 2: Live Connection & Go-Live (Post Billing Credentials)

> Performed once live merchant credentials, API keys, and bank approval are received.

- [ ] **Secure Secrets Provisioning**
  - Store live production keys in secret manager / production `.env` (`ESEWA_SECRET_KEY`, `KHALTI_SECRET_KEY`, `FONEPAY_SECRET_KEY`).
- [ ] **Callback & Webhook URL Registration**
  - Register live callback URLs & webhook endpoints in Khalti Merchant Dashboard, eSewa Merchant Portal, and Fonepay Portal.
- [ ] **Switch Mode to Live**
  - Update `KHALTI_ENV=live`, `ESEWA_ENV=live`, `FONEPAY_ENV=live`.
- [ ] **Live Small Real Transaction Verification**
  - Execute a minimal real money transaction (e.g. NPR 10).
  - Verify ledger entry, gapless transaction number, receipt email arrival, and outbound webhook delivery.
  - Execute a partial/full live refund verification and check ledger reversal.

-- =============================================================================
-- Softmato Technology Pvt Ltd — Core Schema
-- PostgreSQL 16+
--
-- Conventions:
--   * All money is BIGINT in minor units (paisa). Never NUMERIC, never float.
--   * All timestamps are timestamptz, stored UTC. BS dates derived at display.
--   * Ledger tables are append-only, enforced by trigger.
--   * Journal balance is enforced by a deferred constraint trigger.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SECTION 1 — REFERENCE / DIMENSIONS
-- =============================================================================

CREATE TYPE product_kind AS ENUM ('saas', 'agency', 'corporate');

CREATE TABLE products (
    id              TEXT PRIMARY KEY,              -- 'hostelhub', 'questioncall'
    name            TEXT        NOT NULL,
    kind            product_kind NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Chart of accounts
-- -----------------------------------------------------------------------------

CREATE TYPE account_class AS ENUM
    ('asset', 'liability', 'equity', 'revenue', 'direct_cost', 'expense');

CREATE TYPE normal_balance AS ENUM ('debit', 'credit');

CREATE TABLE accounts (
    code            TEXT PRIMARY KEY,              -- '1032'
    name            TEXT          NOT NULL,
    class           account_class NOT NULL,
    normal_balance  normal_balance NOT NULL,
    parent_code     TEXT REFERENCES accounts(code),
    is_postable     BOOLEAN       NOT NULL DEFAULT TRUE,
    is_contra       BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    -- provider balance accounts get reconciled against an external source
    reconcile_source TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT account_code_numeric CHECK (code ~ '^[1-6][0-9]{3}$')
);

CREATE INDEX accounts_parent_idx ON accounts(parent_code);

-- -----------------------------------------------------------------------------
-- Fiscal calendar (Shrawan–Ashad). Seeded per BS year.
-- -----------------------------------------------------------------------------

CREATE TYPE period_status AS ENUM
    ('open', 'reconciliation_required', 'closed', 'locked');

CREATE TABLE fiscal_periods (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fiscal_year     TEXT        NOT NULL,          -- '2082/83'
    period_no       SMALLINT    NOT NULL,          -- 1 = Shrawan ... 12 = Ashad
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    status          period_status NOT NULL DEFAULT 'open',
    closed_at       TIMESTAMPTZ,
    closed_by       BIGINT,

    UNIQUE (fiscal_year, period_no),
    CONSTRAINT period_range_valid CHECK (ends_at > starts_at),
    CONSTRAINT period_no_valid    CHECK (period_no BETWEEN 1 AND 12)
);

CREATE INDEX fiscal_periods_range_idx ON fiscal_periods(starts_at, ends_at);

-- =============================================================================
-- SECTION 2 — THE LEDGER
--
-- This is the part that must never be wrong. Two guarantees:
--   1. A journal entry cannot be committed unbalanced.
--   2. A posted ledger row cannot be updated or deleted.
-- Both are enforced by the database, not the application.
-- =============================================================================

CREATE TYPE journal_source AS ENUM (
    'payment',              -- verified provider payment
    'refund',
    'invoice',
    'revenue_recognition',  -- monthly deferred revenue release
    'settlement',           -- provider wallet -> bank
    'expense',
    'payroll',
    'manual',               -- founder-entered adjustment
    'reversal',
    'opening_balance',
    'period_close'
);

CREATE TABLE journal_entries (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_no          TEXT        NOT NULL,      -- 'JE-2082/83-000001'
    fiscal_period_id    BIGINT      NOT NULL REFERENCES fiscal_periods(id),
    source              journal_source NOT NULL,
    -- free-form pointer back to the originating record
    source_table        TEXT,
    source_id           TEXT,
    description         TEXT        NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL,      -- economic date
    posted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_by           BIGINT,
    reverses_journal_id BIGINT REFERENCES journal_entries(id),
    reversed_by_journal_id BIGINT REFERENCES journal_entries(id),

    UNIQUE (journal_no),
    CONSTRAINT no_self_reversal CHECK (reverses_journal_id IS DISTINCT FROM id)
);

CREATE INDEX journal_entries_period_idx  ON journal_entries(fiscal_period_id);
CREATE INDEX journal_entries_source_idx  ON journal_entries(source_table, source_id);
CREATE INDEX journal_entries_occurred_idx ON journal_entries(occurred_at);

CREATE TYPE entry_direction AS ENUM ('debit', 'credit');

CREATE TABLE ledger_entries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_id      BIGINT      NOT NULL REFERENCES journal_entries(id),
    line_no         SMALLINT    NOT NULL,
    account_code    TEXT        NOT NULL REFERENCES accounts(code),
    direction       entry_direction NOT NULL,
    amount_minor    BIGINT      NOT NULL,
    currency        CHAR(3)     NOT NULL DEFAULT 'NPR',
    product_id      TEXT REFERENCES products(id),
    customer_id     BIGINT,
    memo            TEXT,

    UNIQUE (journal_id, line_no),
    CONSTRAINT amount_positive CHECK (amount_minor > 0),
    CONSTRAINT currency_iso    CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX ledger_entries_journal_idx  ON ledger_entries(journal_id);
CREATE INDEX ledger_entries_account_idx  ON ledger_entries(account_code);
CREATE INDEX ledger_entries_product_idx  ON ledger_entries(product_id);

-- -----------------------------------------------------------------------------
-- GUARANTEE 1: every journal must balance, per currency.
-- Deferred so lines can be inserted one at a time inside a transaction;
-- checked at COMMIT.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_journal_balanced()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_journal_id BIGINT := COALESCE(NEW.journal_id, OLD.journal_id);
    v_currency   CHAR(3);
    v_diff       BIGINT;
BEGIN
    FOR v_currency, v_diff IN
        SELECT currency,
               SUM(CASE WHEN direction = 'debit'
                        THEN amount_minor ELSE -amount_minor END)
        FROM ledger_entries
        WHERE journal_id = v_journal_id
        GROUP BY currency
    LOOP
        IF v_diff <> 0 THEN
            RAISE EXCEPTION
                'Journal % is unbalanced in %: debits minus credits = % paisa',
                v_journal_id, v_currency, v_diff
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE journal_id = v_journal_id) THEN
        RAISE EXCEPTION 'Journal % has no lines', v_journal_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
    AFTER INSERT ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION assert_journal_balanced();

-- -----------------------------------------------------------------------------
-- GUARANTEE 2: append-only. No UPDATE, no DELETE, ever.
-- Corrections are reversing journals.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reject_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        '% on % is not permitted. Post a reversing journal entry instead.',
        TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER ledger_entries_immutable
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- journal_entries allows exactly one mutation: stamping reversed_by_journal_id.
CREATE OR REPLACE FUNCTION journal_entries_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Journal entries cannot be deleted'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
        IF OLD.reversed_by_journal_id IS NOT NULL
           OR NEW.journal_no          IS DISTINCT FROM OLD.journal_no
           OR NEW.fiscal_period_id    IS DISTINCT FROM OLD.fiscal_period_id
           OR NEW.source              IS DISTINCT FROM OLD.source
           OR NEW.occurred_at         IS DISTINCT FROM OLD.occurred_at
           OR NEW.posted_at           IS DISTINCT FROM OLD.posted_at
        THEN
            RAISE EXCEPTION
                'Only reversed_by_journal_id may be set on a posted journal'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_immutable
    BEFORE UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION journal_entries_guard();

-- -----------------------------------------------------------------------------
-- GUARANTEE 3: nothing posts into a closed period.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_period_open()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status period_status;
BEGIN
    SELECT status INTO v_status
    FROM fiscal_periods WHERE id = NEW.fiscal_period_id;

    IF v_status IN ('closed', 'locked') AND NEW.source <> 'period_close' THEN
        RAISE EXCEPTION 'Fiscal period % is %; cannot post',
            NEW.fiscal_period_id, v_status
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_period_open
    BEFORE INSERT ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION assert_period_open();

-- Postable-account guard
CREATE OR REPLACE FUNCTION assert_account_postable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM accounts
        WHERE code = NEW.account_code AND is_postable AND is_active
    ) THEN
        RAISE EXCEPTION 'Account % is not postable or not active', NEW.account_code
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ledger_entries_postable
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION assert_account_postable();

-- =============================================================================
-- SECTION 3 — API CLIENTS (the SaaS products calling the payment API)
-- =============================================================================

CREATE TABLE applications (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      TEXT        NOT NULL REFERENCES products(id),
    name            TEXT        NOT NULL,
    client_id       TEXT        NOT NULL UNIQUE,   -- 'app_live_hostelhub_...'
    secret_hash     TEXT        NOT NULL,          -- argon2id. Never the secret.
    secret_last4    TEXT        NOT NULL,
    -- Rotation overlap (API.md §2): the superseded secret keeps working for
    -- 24 hours so a SaaS can redeploy without a window of 401s.
    previous_secret_hash       TEXT,
    previous_secret_last4      TEXT,
    previous_secret_expires_at TIMESTAMPTZ,
    scopes          TEXT[]      NOT NULL DEFAULT '{}',
    webhook_url     TEXT,
    webhook_secret  TEXT,                          -- for signing outbound events
    is_live         BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    rotated_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- All three overlap columns move together. A hash with no expiry would be
    -- a second permanent credential, which is the opposite of rotating.
    CONSTRAINT previous_secret_complete CHECK (
        (previous_secret_hash IS NULL
         AND previous_secret_last4 IS NULL
         AND previous_secret_expires_at IS NULL)
        OR (previous_secret_hash IS NOT NULL
            AND previous_secret_last4 IS NOT NULL
            AND previous_secret_expires_at IS NOT NULL)
    ),

    CONSTRAINT scopes_known CHECK (
        scopes <@ ARRAY[
            'payment:create','payment:read',
            'invoice:create','invoice:read',
            'refund:request','customer:read'
        ]::TEXT[]
    )
);

CREATE INDEX applications_product_idx ON applications(product_id);

-- =============================================================================
-- SECTION 4 — CUSTOMERS & INVOICES
-- =============================================================================

CREATE TABLE customers (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      TEXT        NOT NULL REFERENCES products(id),
    external_ref    TEXT,                          -- the SaaS's own customer id
    name            TEXT        NOT NULL,
    email           TEXT,
    phone           TEXT,
    pan             TEXT,                          -- customer's PAN, for TDS
    address         TEXT,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (product_id, external_ref)
);

CREATE INDEX customers_email_idx ON customers(lower(email));

CREATE TYPE invoice_status AS ENUM (
    'draft','issued','partially_paid','paid','void','written_off'
);

CREATE TABLE invoices (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no          TEXT        NOT NULL,      -- 'INV-2082/83-000001'
    fiscal_year         TEXT        NOT NULL,
    sequence_no         BIGINT      NOT NULL,
    product_id          TEXT        NOT NULL REFERENCES products(id),
    application_id      BIGINT REFERENCES applications(id),
    customer_id         BIGINT      NOT NULL REFERENCES customers(id),
    external_ref        TEXT,                      -- SaaS-side invoice id
    status              invoice_status NOT NULL DEFAULT 'draft',
    subtotal_minor      BIGINT      NOT NULL,
    discount_minor      BIGINT      NOT NULL DEFAULT 0,
    tax_minor           BIGINT      NOT NULL DEFAULT 0,
    total_minor         BIGINT      NOT NULL,
    paid_minor          BIGINT      NOT NULL DEFAULT 0,
    tds_withheld_minor  BIGINT      NOT NULL DEFAULT 0,
    currency            CHAR(3)     NOT NULL DEFAULT 'NPR',
    -- deferred revenue window; NULL for one-off project invoices
    service_starts_at   TIMESTAMPTZ,
    service_ends_at     TIMESTAMPTZ,
    issued_at           TIMESTAMPTZ,
    due_at              TIMESTAMPTZ,
    metadata            JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- gapless, unique numbering per fiscal year
    UNIQUE (fiscal_year, sequence_no),
    UNIQUE (invoice_no),
    UNIQUE (application_id, external_ref),

    CONSTRAINT amounts_non_negative CHECK (
        subtotal_minor >= 0 AND discount_minor >= 0
        AND tax_minor >= 0 AND paid_minor >= 0
        AND tds_withheld_minor >= 0
    ),
    CONSTRAINT total_consistent CHECK (
        total_minor = subtotal_minor - discount_minor + tax_minor
    ),
    CONSTRAINT no_overpayment CHECK (paid_minor <= total_minor),
    CONSTRAINT service_window_valid CHECK (
        service_ends_at IS NULL OR service_starts_at IS NULL
        OR service_ends_at > service_starts_at
    )
);

CREATE INDEX invoices_customer_idx ON invoices(customer_id);
CREATE INDEX invoices_status_idx   ON invoices(status) WHERE status <> 'paid';

CREATE TABLE invoice_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id      BIGINT      NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_no         SMALLINT    NOT NULL,
    description     TEXT        NOT NULL,
    quantity        NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit_price_minor BIGINT     NOT NULL,
    amount_minor    BIGINT      NOT NULL,
    revenue_account TEXT        NOT NULL REFERENCES accounts(code),

    UNIQUE (invoice_id, line_no),
    CONSTRAINT line_amount_positive CHECK (amount_minor >= 0)
);

-- =============================================================================
-- SECTION 5 — PAYMENT PROVIDERS & SESSIONS
-- =============================================================================

CREATE TABLE payment_providers (
    id                  TEXT PRIMARY KEY,          -- 'khalti','esewa','fonepay','manual_qr'
    display_name        TEXT        NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    -- amount-based routing: hides wallets when the amount exceeds their limit
    min_amount_minor    BIGINT      NOT NULL DEFAULT 0,
    max_amount_minor    BIGINT,
    supports_refund     BOOLEAN     NOT NULL DEFAULT FALSE,
    supports_callback   BOOLEAN     NOT NULL DEFAULT FALSE,
    requires_polling    BOOLEAN     NOT NULL DEFAULT TRUE,
    poll_interval_sec   INTEGER     NOT NULL DEFAULT 60,
    poll_timeout_sec    INTEGER     NOT NULL DEFAULT 3600,
    balance_account     TEXT        NOT NULL REFERENCES accounts(code),
    fee_account         TEXT        NOT NULL REFERENCES accounts(code),
    config              JSONB       NOT NULL DEFAULT '{}',  -- non-secret only
    sort_order          SMALLINT    NOT NULL DEFAULT 0,

    CONSTRAINT limits_sane CHECK (
        max_amount_minor IS NULL OR max_amount_minor > min_amount_minor
    )
);

CREATE TYPE session_status AS ENUM (
    'created','provider_selected','pending','succeeded',
    'failed','cancelled','expired'
);

CREATE TABLE payment_sessions (
    id                  TEXT PRIMARY KEY,          -- 'cs_live_<32 random bytes>'
    invoice_id          BIGINT      NOT NULL REFERENCES invoices(id),
    application_id      BIGINT REFERENCES applications(id),
    product_id          TEXT        NOT NULL REFERENCES products(id),
    customer_id         BIGINT      NOT NULL REFERENCES customers(id),
    amount_minor        BIGINT      NOT NULL,
    currency            CHAR(3)     NOT NULL DEFAULT 'NPR',
    status              session_status NOT NULL DEFAULT 'created',
    allowed_providers   TEXT[]      NOT NULL,
    selected_provider   TEXT REFERENCES payment_providers(id),
    return_url          TEXT,
    metadata            JSONB       NOT NULL DEFAULT '{}',
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT session_amount_positive CHECK (amount_minor > 0),
    CONSTRAINT session_expiry_future   CHECK (expires_at > created_at),
    CONSTRAINT session_id_format       CHECK (id ~ '^cs_(live|test)_[A-Za-z0-9_-]{32,}$')
);

CREATE INDEX sessions_invoice_idx ON payment_sessions(invoice_id);
CREATE INDEX sessions_expiry_idx  ON payment_sessions(expires_at)
    WHERE status IN ('created','provider_selected','pending');

-- =============================================================================
-- SECTION 6 — TRANSACTIONS
-- =============================================================================

CREATE TYPE txn_status AS ENUM (
    'created','pending','succeeded','failed','cancelled','expired',
    'partially_refunded','refunded','reversed','reconciliation_required'
);

CREATE TABLE transactions (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    txn_no                  TEXT        NOT NULL UNIQUE,  -- 'TXN-2082/83-00000001'
    session_id              TEXT REFERENCES payment_sessions(id),
    invoice_id              BIGINT      NOT NULL REFERENCES invoices(id),
    application_id          BIGINT REFERENCES applications(id),
    product_id              TEXT        NOT NULL REFERENCES products(id),
    customer_id             BIGINT      NOT NULL REFERENCES customers(id),
    provider_id             TEXT        NOT NULL REFERENCES payment_providers(id),

    -- provider identifiers. Khalti: pidx. eSewa: booking_id + correlation_id.
    provider_ref            TEXT,
    provider_txn_id         TEXT,
    provider_correlation_id TEXT,

    status                  txn_status  NOT NULL DEFAULT 'created',
    gross_amount_minor      BIGINT      NOT NULL,
    provider_fee_minor      BIGINT      NOT NULL DEFAULT 0,
    net_amount_minor        BIGINT      NOT NULL,
    refunded_amount_minor   BIGINT      NOT NULL DEFAULT 0,
    currency                CHAR(3)     NOT NULL DEFAULT 'NPR',

    journal_id              BIGINT REFERENCES journal_entries(id),

    -- polling state (Khalti has no webhook; this is the confirmation path)
    poll_attempts           INTEGER     NOT NULL DEFAULT 0,
    next_poll_at            TIMESTAMPTZ,
    last_polled_at          TIMESTAMPTZ,

    -- manual_qr evidence
    proof_url               TEXT,
    approved_by             BIGINT,
    approved_at             TIMESTAMPTZ,

    failure_code            TEXT,
    failure_reason          TEXT,
    initiated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    succeeded_at            TIMESTAMPTZ,
    metadata                JSONB       NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- one transaction per provider reference: the anti-double-credit guard
    UNIQUE (provider_id, provider_ref),
    UNIQUE (provider_id, provider_txn_id),

    CONSTRAINT gross_positive     CHECK (gross_amount_minor > 0),
    CONSTRAINT fee_non_negative   CHECK (provider_fee_minor >= 0),
    CONSTRAINT net_consistent     CHECK (net_amount_minor = gross_amount_minor - provider_fee_minor),
    CONSTRAINT refund_within_gross CHECK (refunded_amount_minor <= gross_amount_minor),
    CONSTRAINT succeeded_needs_time CHECK (
        status <> 'succeeded' OR succeeded_at IS NOT NULL
    ),
    CONSTRAINT succeeded_needs_journal CHECK (
        status NOT IN ('succeeded','refunded','partially_refunded')
        OR journal_id IS NOT NULL
    )
);

CREATE INDEX txn_invoice_idx  ON transactions(invoice_id);
CREATE INDEX txn_product_idx  ON transactions(product_id);
CREATE INDEX txn_status_idx   ON transactions(status);
-- the polling worker's query
CREATE INDEX txn_poll_idx ON transactions(next_poll_at)
    WHERE status IN ('created','pending');

-- =============================================================================
-- SECTION 7 — REFUNDS
-- =============================================================================

CREATE TYPE refund_status AS ENUM (
    'requested','approved','pending','succeeded','failed','rejected'
);

CREATE TABLE refunds (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    refund_no           TEXT        NOT NULL UNIQUE,
    transaction_id      BIGINT      NOT NULL REFERENCES transactions(id),
    amount_minor        BIGINT      NOT NULL,
    currency            CHAR(3)     NOT NULL DEFAULT 'NPR',
    reason              TEXT        NOT NULL,
    status              refund_status NOT NULL DEFAULT 'requested',
    provider_refund_id  TEXT,
    journal_id          BIGINT REFERENCES journal_entries(id),
    requested_by        BIGINT,
    approved_by         BIGINT,
    requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,

    CONSTRAINT refund_amount_positive CHECK (amount_minor > 0),
    CONSTRAINT refund_needs_second_person CHECK (
        status NOT IN ('approved','pending','succeeded')
        OR (approved_by IS NOT NULL AND approved_by IS DISTINCT FROM requested_by)
    )
);

CREATE INDEX refunds_txn_idx ON refunds(transaction_id);

-- =============================================================================
-- SECTION 8 — PROVIDER EVENTS (raw, immutable, deduplicated)
-- =============================================================================

CREATE TABLE provider_events (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider_id         TEXT        NOT NULL REFERENCES payment_providers(id),
    -- eSewa callback correlation_id, Khalti pidx+status, etc.
    provider_event_id   TEXT        NOT NULL,
    event_type          TEXT        NOT NULL,      -- 'callback','poll','settlement'
    signature_valid     BOOLEAN     NOT NULL,
    payload             JSONB       NOT NULL,
    headers             JSONB,
    transaction_id      BIGINT REFERENCES transactions(id),
    processed_at        TIMESTAMPTZ,
    processing_error    TEXT,
    received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- the idempotency guarantee: same event twice = one row
    UNIQUE (provider_id, provider_event_id, event_type)
);

CREATE INDEX provider_events_unprocessed_idx ON provider_events(received_at)
    WHERE processed_at IS NULL;

CREATE TRIGGER provider_events_immutable
    BEFORE DELETE ON provider_events
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- =============================================================================
-- SECTION 9 — IDEMPOTENCY & OUTBOUND WEBHOOKS
-- =============================================================================

CREATE TABLE idempotency_keys (
    key             TEXT        NOT NULL,
    application_id  BIGINT      NOT NULL REFERENCES applications(id),
    endpoint        TEXT        NOT NULL,
    request_hash    TEXT        NOT NULL,
    response_status SMALLINT,
    response_body   JSONB,
    locked_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (application_id, key)
);

CREATE INDEX idempotency_expiry_idx ON idempotency_keys(expires_at);

CREATE TYPE delivery_status AS ENUM ('pending','delivered','failed','abandoned');

CREATE TABLE webhook_deliveries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id  BIGINT      NOT NULL REFERENCES applications(id),
    event_type      TEXT        NOT NULL,          -- 'payment.success'
    payload         JSONB       NOT NULL,
    signature       TEXT        NOT NULL,
    status          delivery_status NOT NULL DEFAULT 'pending',
    attempts        INTEGER     NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    last_status_code SMALLINT,
    last_error      TEXT,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_retry_idx ON webhook_deliveries(next_attempt_at)
    WHERE status = 'pending';

-- =============================================================================
-- SECTION 10 — SUBSCRIPTIONS
-- Nepali wallets have no server-initiated auto-debit. The engine generates
-- renewal invoices and reminders; the customer initiates each payment.
-- =============================================================================

CREATE TYPE subscription_status AS ENUM (
    'trialing','active','past_due','grace','suspended','cancelled','expired'
);

CREATE TABLE subscriptions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id          TEXT        NOT NULL REFERENCES products(id),
    application_id      BIGINT REFERENCES applications(id),
    customer_id         BIGINT      NOT NULL REFERENCES customers(id),
    external_ref        TEXT,
    plan_code           TEXT        NOT NULL,
    amount_minor        BIGINT      NOT NULL,
    currency            CHAR(3)     NOT NULL DEFAULT 'NPR',
    interval_months     SMALLINT    NOT NULL DEFAULT 1,
    status              subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    grace_days          SMALLINT    NOT NULL DEFAULT 7,
    cancel_at_period_end BOOLEAN    NOT NULL DEFAULT FALSE,
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (application_id, external_ref),
    CONSTRAINT sub_period_valid CHECK (current_period_end > current_period_start),
    CONSTRAINT sub_interval_valid CHECK (interval_months BETWEEN 1 AND 36)
);

CREATE INDEX subs_renewal_idx ON subscriptions(current_period_end)
    WHERE status IN ('active','past_due','grace');

-- Reserved for a future card rail. Unused today, but the shape is here so
-- enabling auto-debit later is a flag, not a migration.
CREATE TABLE payment_mandates (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT      NOT NULL REFERENCES customers(id),
    provider_id     TEXT        NOT NULL REFERENCES payment_providers(id),
    provider_token  TEXT        NOT NULL,
    display_hint    TEXT,                          -- '**** 4242'
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 11 — RECONCILIATION
-- =============================================================================

CREATE TYPE recon_status AS ENUM ('open','matched','mismatched','resolved');

CREATE TABLE reconciliation_runs (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider_id         TEXT        NOT NULL REFERENCES payment_providers(id),
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    internal_total_minor BIGINT     NOT NULL,
    provider_total_minor BIGINT,
    bank_total_minor    BIGINT,
    difference_minor    BIGINT,
    status              recon_status NOT NULL DEFAULT 'open',
    notes               TEXT,
    run_by              BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ
);

CREATE TABLE reconciliation_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id          BIGINT      NOT NULL REFERENCES reconciliation_runs(id),
    transaction_id  BIGINT REFERENCES transactions(id),
    provider_ref    TEXT,
    internal_minor  BIGINT,
    provider_minor  BIGINT,
    status          recon_status NOT NULL DEFAULT 'open',
    note            TEXT
);

-- =============================================================================
-- SECTION 12 — USERS & AUDIT
-- =============================================================================

CREATE TABLE admin_users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    password_hash   TEXT        NOT NULL,          -- argon2id
    totp_secret     TEXT,                          -- encrypted at rest
    totp_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
    role            TEXT        NOT NULL DEFAULT 'founder',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- no admin without 2FA, enforced by the database
    CONSTRAINT totp_required CHECK (NOT is_active OR totp_enabled)
);

CREATE TABLE audit_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_type      TEXT        NOT NULL,          -- 'admin','application','system'
    actor_id        TEXT,
    action          TEXT        NOT NULL,          -- 'refund.approve'
    resource_type   TEXT        NOT NULL,
    resource_id     TEXT,
    before_state    JSONB,
    after_state     JSONB,
    ip_address      INET,
    user_agent      TEXT,
    request_id      TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_resource_idx ON audit_logs(resource_type, resource_id);
CREATE INDEX audit_actor_idx    ON audit_logs(actor_type, actor_id);
CREATE INDEX audit_time_idx     ON audit_logs(occurred_at DESC);

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- =============================================================================
-- SECTION 13 — REPORTING VIEWS
-- =============================================================================

CREATE VIEW v_trial_balance AS
SELECT
    a.code,
    a.name,
    a.class,
    fp.fiscal_year,
    SUM(CASE WHEN le.direction = 'debit'  THEN le.amount_minor ELSE 0 END) AS debit_minor,
    SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE 0 END) AS credit_minor,
    SUM(CASE WHEN le.direction = 'debit'  THEN le.amount_minor
             ELSE -le.amount_minor END)
        * CASE WHEN a.normal_balance = 'debit' THEN 1 ELSE -1 END AS balance_minor
FROM accounts a
JOIN ledger_entries  le ON le.account_code = a.code
JOIN journal_entries je ON je.id = le.journal_id
JOIN fiscal_periods  fp ON fp.id = je.fiscal_period_id
GROUP BY a.code, a.name, a.class, a.normal_balance, fp.fiscal_year;

CREATE VIEW v_product_pl AS
SELECT
    le.product_id,
    fp.fiscal_year,
    fp.period_no,
    a.class,
    a.code,
    a.name,
    SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor
             ELSE -le.amount_minor END) AS amount_minor
FROM ledger_entries  le
JOIN accounts        a  ON a.code = le.account_code
JOIN journal_entries je ON je.id = le.journal_id
JOIN fiscal_periods  fp ON fp.id = je.fiscal_period_id
WHERE a.class IN ('revenue','direct_cost','expense')
GROUP BY le.product_id, fp.fiscal_year, fp.period_no, a.class, a.code, a.name;

-- Sanity check: this must always return zero rows.
CREATE VIEW v_unbalanced_journals AS
SELECT journal_id, currency,
       SUM(CASE WHEN direction = 'debit' THEN amount_minor
                ELSE -amount_minor END) AS difference_minor
FROM ledger_entries
GROUP BY journal_id, currency
HAVING SUM(CASE WHEN direction = 'debit' THEN amount_minor
                ELSE -amount_minor END) <> 0;

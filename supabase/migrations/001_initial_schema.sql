-- Bankero — Initial Supabase Schema
-- Migration: 001_initial_schema.sql
-- Apply: paste into Supabase Dashboard → SQL Editor → Run
-- Or: supabase db push (if using Supabase CLI locally)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS — mirrors on-chain wallet identity
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address   TEXT        UNIQUE NOT NULL,
    display_name     TEXT,
    -- SHA-256 hex of phone number — never store raw numbers
    phone_hash       TEXT,
    kyc_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    anchor_linked    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_wallet_idx ON users(wallet_address);

-- ============================================================
-- 2. LENDERS — NGOs, microfinance orgs, individual lenders
-- ============================================================
CREATE TABLE IF NOT EXISTS lenders (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address   TEXT        UNIQUE NOT NULL,
    display_name     TEXT        NOT NULL,
    kyc_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    max_loan_xlm     INTEGER     NOT NULL DEFAULT 500 CHECK (max_loan_xlm > 0),
    contact_email    TEXT,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lenders_wallet_idx ON lenders(wallet_address);

-- ============================================================
-- 3. LOAN METADATA — off-chain supplement to on-chain Loan struct
--    loan_id matches the uint64 from loan_registry contract
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_metadata (
    loan_id          BIGINT      PRIMARY KEY,
    borrower_wallet  TEXT        NOT NULL REFERENCES users(wallet_address),
    lender_wallet    TEXT        NOT NULL REFERENCES lenders(wallet_address),
    purpose          TEXT        CHECK (purpose IN (
                         'Pang-negosyo',
                         'Gamot',
                         'Pang-aral',
                         'Bahay',
                         'Pagkain',
                         'Iba pa'
                     )),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS loan_meta_borrower_idx ON loan_metadata(borrower_wallet);
CREATE INDEX IF NOT EXISTS loan_meta_lender_idx   ON loan_metadata(lender_wallet);

-- ============================================================
-- 4. ANCHOR ATTESTATIONS — admin/anchor-attested score inputs
--    Writable only by service_role (admin cron)
-- ============================================================
CREATE TABLE IF NOT EXISTS anchor_attestations (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address   TEXT        NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    anchor_score     INTEGER     NOT NULL CHECK (anchor_score BETWEEN 0 AND 100),
    attested_by      TEXT        NOT NULL DEFAULT 'GCash via Stellar',
    attested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tx_reference     TEXT        -- Stellar tx hash for audit trail
);
CREATE INDEX IF NOT EXISTS anchor_wallet_idx ON anchor_attestations(wallet_address);
CREATE INDEX IF NOT EXISTS anchor_time_idx   ON anchor_attestations(attested_at DESC);

-- ============================================================
-- 5. TX SCORE CACHE — updated by weekly Horizon API cron
--    Upserted on each cron run; one row per wallet
-- ============================================================
CREATE TABLE IF NOT EXISTS tx_score_cache (
    wallet_address     TEXT          PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
    tx_score           INTEGER       NOT NULL DEFAULT 0 CHECK (tx_score BETWEEN 0 AND 100),
    horizon_checked_at TIMESTAMPTZ,
    tx_count_30d       INTEGER       NOT NULL DEFAULT 0,
    avg_tx_volume_xlm  NUMERIC(18,7) NOT NULL DEFAULT 0
);

-- ============================================================
-- 6. NOTIFICATIONS — in-app queue for borrower/lender alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address   TEXT        NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    type             TEXT        NOT NULL CHECK (type IN (
                         'repayment_due',
                         'vouch_received',
                         'vouch_revoked',
                         'loan_approved',
                         'loan_disbursed',
                         'loan_repaid',
                         'loan_defaulted',
                         'score_updated'
                     )),
    message          TEXT        NOT NULL,
    is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_wallet_idx  ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS notif_unread_idx  ON notifications(wallet_address, is_read)
    WHERE is_read = FALSE;

-- ============================================================
-- UPDATED_AT auto-trigger for users table
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_metadata       ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchor_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tx_score_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Helper: extract wallet_address from JWT claim
-- Frontend must set this claim via Supabase auth custom JWT or anon header
CREATE OR REPLACE FUNCTION jwt_wallet() RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT current_setting('request.jwt.claims', true)::json->>'wallet_address';
$$;

-- users: self-read/insert/update only
CREATE POLICY users_select ON users FOR SELECT USING (wallet_address = jwt_wallet());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (wallet_address = jwt_wallet());
CREATE POLICY users_update ON users FOR UPDATE USING (wallet_address = jwt_wallet());

-- lenders: public read (borrowers need to see lender list); service_role writes
CREATE POLICY lenders_read ON lenders FOR SELECT USING (TRUE);

-- loan_metadata: borrower sees own loans; lender sees loans they issued
CREATE POLICY loan_borrower_read ON loan_metadata FOR SELECT
    USING (borrower_wallet = jwt_wallet());
CREATE POLICY loan_lender_read ON loan_metadata FOR SELECT
    USING (lender_wallet = jwt_wallet());
CREATE POLICY loan_insert ON loan_metadata FOR INSERT
    WITH CHECK (borrower_wallet = jwt_wallet());

-- anchor_attestations: read own; service_role writes
CREATE POLICY anchor_read ON anchor_attestations FOR SELECT
    USING (wallet_address = jwt_wallet());

-- tx_score_cache: read own; service_role writes
CREATE POLICY tx_cache_read ON tx_score_cache FOR SELECT
    USING (wallet_address = jwt_wallet());

-- notifications: read/mark-read own only
CREATE POLICY notif_read ON notifications FOR SELECT
    USING (wallet_address = jwt_wallet());
CREATE POLICY notif_update ON notifications FOR UPDATE
    USING (wallet_address = jwt_wallet());

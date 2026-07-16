-- ─────────────────────────────────────────────────────────────
-- Feature: loan backing choice (Community Vouch / Savings collateral / None)
-- ─────────────────────────────────────────────────────────────
-- A borrower can now choose, at application time, whether to back their
-- loan with community vouching, locked savings collateral, or neither.
-- `loans` predates tracked migrations (same situation as 009/011/013 —
-- no CREATE TABLE for it exists in this repo) so this is ALTER-only,
-- matching that established convention.

alter table loans add column if not exists backing_type text not null default 'none'
  check (backing_type in ('none', 'vouch', 'savings'));
alter table loans add column if not exists backing_amount numeric not null default 0;

-- Needed so approve/disburse/repay/mark-defaulted can reference the
-- on-chain loan_registry loan_id for savings-backed loans, which are the
-- only loans that get real on-chain lifecycle calls (see
-- docs/loan-backing-deployment.md for why vouch/none-backed loans keep
-- today's off-chain-only behavior).
alter table loans add column if not exists onchain_loan_id bigint;

-- No new RLS policy needed: 011_fix_loans_rls_authenticated.sql's
-- `using (true)` policies are row-level, not column-level, and already
-- cover any new column on existing rows.

-- ─────────────────────────────────────────────────────────────
-- savings_bank_transactions: widen the event-type CHECK for lock/release/seize
-- ─────────────────────────────────────────────────────────────
-- CAUTION: 005_savings_bank.sql's inline `check (type in (...))` was never
-- given an explicit constraint name, so Postgres auto-generated one. Before
-- running this against the live project, verify the real name — e.g.
--   select conname from pg_constraint
--   where conrelid = 'savings_bank_transactions'::regclass and contype = 'c';
-- — and update the `drop constraint` line below if it differs from the
-- guessed default-naming-convention name used here.
alter table savings_bank_transactions drop constraint if exists savings_bank_transactions_type_check;
alter table savings_bank_transactions add constraint savings_bank_transactions_type_check
  check (type in ('deposit', 'withdraw', 'lock', 'release', 'seize'));

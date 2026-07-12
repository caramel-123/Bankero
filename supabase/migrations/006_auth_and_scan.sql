-- ─────────────────────────────────────────────────────────────
-- PATCH 1.7.12: Login-first auth + e-payment AI scanner
-- ─────────────────────────────────────────────────────────────

-- ── Borrower auth linkage ──────────────────────────────────
-- A `users` row now gets created at signup (email/password or Google),
-- before any wallet is connected — wallet_address can no longer be
-- required at insert time.
alter table users alter column wallet_address drop not null;
alter table users add column if not exists auth_user_id uuid references auth.users(id) unique;
alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists email text;

-- Formalizes columns the app already reads/writes on `lenders` that
-- drifted outside tracked migrations (auth_user_id, first_name, last_name).
alter table lenders add column if not exists auth_user_id uuid references auth.users(id) unique;
alter table lenders add column if not exists first_name text;
alter table lenders add column if not exists last_name text;

-- ── E-payment AI scanner ────────────────────────────────────
-- Single-photo verification of any e-wallet transaction (GCash, Maya,
-- etc.), replacing the old two-photo utility-bill Proof of Payment flow.
create table if not exists epayment_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stellar_address text not null,
  image_url text not null,
  extracted_amount numeric,
  extracted_reference text,
  extracted_date date,
  extracted_status text,
  validation_status text default 'pending' check (validation_status in ('pending', 'passed', 'failed')),
  validation_errors jsonb,
  score_bonus_applied integer default 0,
  created_at timestamptz default now()
);

alter table epayment_scans enable row level security;

create policy "anon read epayment_scans"
  on epayment_scans for select to anon using (true);
create policy "anon insert epayment_scans"
  on epayment_scans for insert to anon with check (true);
create policy "anon update epayment_scans"
  on epayment_scans for update to anon using (true) with check (true);

-- ── Retire the old two-photo Proof of Payment feature ──────
-- Fully replaced by epayment_scans (single photo, no biller pre-registration).
drop table if exists pop_submissions cascade;
drop table if exists pop_streaks cascade;
drop table if exists utility_accounts cascade;

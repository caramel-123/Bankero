-- ─────────────────────────────────────────────────────────────
-- Feature 1: Proof of Payment (POP) Verification Engine
-- Feature 2: Weekly XLM Savings Tracker
-- ─────────────────────────────────────────────────────────────

-- Registered utility accounts (one per user per biller)
create table if not exists utility_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  biller_name text not null check (biller_name in ('Meralco','Maynilad','Manila Water','PLDT','Globe')),
  account_number text not null,
  service_address text,
  gcash_number text not null,
  registered_at timestamptz default now(),
  unique(user_id, biller_name)
);

-- Individual bill + receipt submission per cycle
create table if not exists pop_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  utility_account_id uuid references utility_accounts(id),
  billing_period text not null, -- 'MM/YYYY'
  amount_due numeric not null,
  amount_paid numeric not null,
  transaction_date date not null,
  reference_number text unique not null,
  biller_name text not null,
  bill_image_url text not null,
  receipt_image_url text not null,
  ocr_bill_data jsonb,
  ocr_receipt_data jsonb,
  validation_status text default 'pending' check (validation_status in ('pending','passed','failed')),
  validation_errors jsonb,
  score_applied boolean default false,
  created_at timestamptz default now()
);

-- Consecutive streak per user per biller
create table if not exists pop_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  utility_account_id uuid references utility_accounts(id),
  consecutive_months integer default 0,
  last_verified_period text, -- 'MM/YYYY'
  total_score_bonus integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, utility_account_id)
);

-- Weekly XLM savings streaks
create table if not exists savings_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stellar_address text not null,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_deposit_week text, -- 'YYYY-WW'
  last_deposit_amount numeric,
  last_deposit_tx_hash text,
  total_bonus_earned integer default 0,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Individual weekly deposit records
create table if not exists weekly_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stellar_address text not null,
  week_identifier text not null, -- 'YYYY-WW'
  deposit_amount numeric not null,
  tx_hash text not null,
  deposited_at timestamptz not null,
  streak_count_at_deposit integer,
  bonus_awarded integer default 0,
  created_at timestamptz default now(),
  unique(user_id, week_identifier)
);

-- ── RLS ──────────────────────────────────────────────────────

alter table utility_accounts  enable row level security;
alter table pop_submissions   enable row level security;
alter table pop_streaks       enable row level security;
alter table savings_streaks   enable row level security;
alter table weekly_deposits   enable row level security;

-- utility_accounts
create policy "user reads own utility_accounts"
  on utility_accounts for select using (user_id = (select id from users where wallet_address = auth.jwt()->>'sub' limit 1));
create policy "user inserts own utility_accounts"
  on utility_accounts for insert with check (user_id = (select id from users where wallet_address = auth.jwt()->>'sub' limit 1));
create policy "anon read utility_accounts"
  on utility_accounts for select to anon using (true);
create policy "anon insert utility_accounts"
  on utility_accounts for insert to anon with check (true);

-- pop_submissions
create policy "user reads own pop_submissions"
  on pop_submissions for select using (user_id = (select id from users where wallet_address = auth.jwt()->>'sub' limit 1));
create policy "user inserts own pop_submissions"
  on pop_submissions for insert with check (user_id = (select id from users where wallet_address = auth.jwt()->>'sub' limit 1));
create policy "user updates own pop_submissions"
  on pop_submissions for update using (user_id = (select id from users where wallet_address = auth.jwt()->>'sub' limit 1));
create policy "anon read pop_submissions"
  on pop_submissions for select to anon using (true);
create policy "anon insert pop_submissions"
  on pop_submissions for insert to anon with check (true);
create policy "anon update pop_submissions"
  on pop_submissions for update to anon using (true) with check (true);

-- pop_streaks
create policy "anon read pop_streaks"    on pop_streaks for select to anon using (true);
create policy "anon insert pop_streaks"  on pop_streaks for insert to anon with check (true);
create policy "anon update pop_streaks"  on pop_streaks for update to anon using (true) with check (true);

-- savings_streaks
create policy "anon read savings_streaks"    on savings_streaks for select to anon using (true);
create policy "anon insert savings_streaks"  on savings_streaks for insert to anon with check (true);
create policy "anon update savings_streaks"  on savings_streaks for update to anon using (true) with check (true);

-- weekly_deposits
create policy "anon read weekly_deposits"    on weekly_deposits for select to anon using (true);
create policy "anon insert weekly_deposits"  on weekly_deposits for insert to anon with check (true);
create policy "anon update weekly_deposits"  on weekly_deposits for update to anon using (true) with check (true);

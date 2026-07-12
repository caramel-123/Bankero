-- ─────────────────────────────────────────────────────────────
-- Feature: Savings Bank (on-chain XLM deposit/withdraw balance)
-- ─────────────────────────────────────────────────────────────
-- Balance itself lives on-chain in the savings_bank contract
-- (source of truth via get_balance). This table only logs
-- transaction history for fast UI reads, mirroring the on-chain
-- state the same way paluwagan_contributions mirrors group state.

create table if not exists savings_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stellar_address text not null,
  type text not null check (type in ('deposit', 'withdraw')),
  amount_xlm numeric not null,
  tx_hash text not null,
  balance_after_xlm numeric not null,
  score_bonus_applied integer default 0,
  created_at timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────

alter table savings_bank_transactions enable row level security;

create policy "anon read savings_bank_transactions"
  on savings_bank_transactions for select to anon using (true);
create policy "anon insert savings_bank_transactions"
  on savings_bank_transactions for insert to anon with check (true);

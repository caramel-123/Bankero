-- ─────────────────────────────────────────────────────────────
-- Fix: savings_bank_transactions, savings_streaks, weekly_deposits
-- only ever had `anon`-only RLS policies and no GRANTs at all
-- ─────────────────────────────────────────────────────────────
-- Same class of bug as 008/010/011 (users/lenders/loans) and 012
-- (paluwagan): these three tables predate the login-first auth flow
-- (002/005) and were never updated once borrowers started acting
-- under an `authenticated` Supabase Auth session instead of `anon`.
-- Both layers were missing: the RLS policies only cover `anon`, and
-- there was never an explicit GRANT for either role, so reads/writes
-- from a logged-in borrower fail silently before RLS is even
-- evaluated — the Savings Bank deposit itself succeeds on-chain, but
-- the transaction-history row and the weekly-streak row never get
-- written, so the Savings Streak page always reads back empty.
--
-- Idempotent: drops both the old (`anon ...`) and new policy names
-- before creating, so re-running this file is safe.

drop policy if exists "anon read savings_bank_transactions"   on savings_bank_transactions;
drop policy if exists "anon insert savings_bank_transactions" on savings_bank_transactions;
drop policy if exists "read savings_bank_transactions"        on savings_bank_transactions;
drop policy if exists "insert savings_bank_transactions"      on savings_bank_transactions;

create policy "read savings_bank_transactions"   on savings_bank_transactions for select to anon, authenticated using (true);
create policy "insert savings_bank_transactions" on savings_bank_transactions for insert to anon, authenticated with check (true);

grant select, insert on savings_bank_transactions to anon, authenticated;

drop policy if exists "anon read savings_streaks"   on savings_streaks;
drop policy if exists "anon insert savings_streaks" on savings_streaks;
drop policy if exists "anon update savings_streaks" on savings_streaks;
drop policy if exists "read savings_streaks"        on savings_streaks;
drop policy if exists "insert savings_streaks"      on savings_streaks;
drop policy if exists "update savings_streaks"      on savings_streaks;

create policy "read savings_streaks"   on savings_streaks for select to anon, authenticated using (true);
create policy "insert savings_streaks" on savings_streaks for insert to anon, authenticated with check (true);
create policy "update savings_streaks" on savings_streaks for update to anon, authenticated using (true) with check (true);

grant select, insert, update on savings_streaks to anon, authenticated;

drop policy if exists "anon read weekly_deposits"   on weekly_deposits;
drop policy if exists "anon insert weekly_deposits" on weekly_deposits;
drop policy if exists "anon update weekly_deposits" on weekly_deposits;
drop policy if exists "read weekly_deposits"        on weekly_deposits;
drop policy if exists "insert weekly_deposits"      on weekly_deposits;
drop policy if exists "update weekly_deposits"      on weekly_deposits;

create policy "read weekly_deposits"   on weekly_deposits for select to anon, authenticated using (true);
create policy "insert weekly_deposits" on weekly_deposits for insert to anon, authenticated with check (true);
create policy "update weekly_deposits" on weekly_deposits for update to anon, authenticated using (true) with check (true);

grant select, insert, update on weekly_deposits to anon, authenticated;

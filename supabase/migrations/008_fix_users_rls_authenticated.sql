-- ─────────────────────────────────────────────────────────────
-- Fix: users RLS policies only covered the `anon` role
-- ─────────────────────────────────────────────────────────────
-- 007 granted access to `anon`, but once a borrower actually has a
-- session (post-login), Supabase sends requests as `authenticated`,
-- not `anon` — a role that was never covered by any policy or grant,
-- so every post-login profile read/write was silently blocked by RLS.

drop policy if exists "anon read users" on users;
drop policy if exists "anon insert users" on users;
drop policy if exists "anon update users" on users;

create policy "read users" on users for select to anon, authenticated using (true);
create policy "insert users" on users for insert to anon, authenticated with check (true);
create policy "update users" on users for update to anon, authenticated using (true) with check (true);

grant select, insert, update on users to anon, authenticated;

-- Same anon-only gap exists on two other tables from this patch — fix
-- them now too, before anyone hits the same wall using those features.

drop policy if exists "anon read savings_bank_transactions" on savings_bank_transactions;
drop policy if exists "anon insert savings_bank_transactions" on savings_bank_transactions;

create policy "read savings_bank_transactions" on savings_bank_transactions for select to anon, authenticated using (true);
create policy "insert savings_bank_transactions" on savings_bank_transactions for insert to anon, authenticated with check (true);

grant select, insert on savings_bank_transactions to anon, authenticated;

drop policy if exists "anon read epayment_scans" on epayment_scans;
drop policy if exists "anon insert epayment_scans" on epayment_scans;
drop policy if exists "anon update epayment_scans" on epayment_scans;

create policy "read epayment_scans" on epayment_scans for select to anon, authenticated using (true);
create policy "insert epayment_scans" on epayment_scans for insert to anon, authenticated with check (true);
create policy "update epayment_scans" on epayment_scans for update to anon, authenticated using (true) with check (true);

grant select, insert, update on epayment_scans to anon, authenticated;

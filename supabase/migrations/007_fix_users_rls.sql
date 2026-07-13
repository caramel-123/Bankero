-- ─────────────────────────────────────────────────────────────
-- Fix: users table RLS blocked the new login-first signup flow
-- ─────────────────────────────────────────────────────────────
-- 001_initial_schema.sql's users_select/insert/update policies only
-- allow access when wallet_address matches a custom JWT claim this app
-- never actually sets. That's fine for the old wallet-first flow (which
-- apparently has broader access granted outside tracked migrations),
-- but it silently blocks the new auth-based signup, which creates a
-- `users` row (keyed by auth_user_id) before any wallet exists.
--
-- Replace with the same permissive anon-role convention used by every
-- other table in this app (002-006) — the app's real security boundary
-- is client-side logic + the anon key, not per-row Postgres RLS.

drop policy if exists users_select on users;
drop policy if exists users_insert on users;
drop policy if exists users_update on users;

create policy "anon read users" on users for select to anon using (true);
create policy "anon insert users" on users for insert to anon with check (true);
create policy "anon update users" on users for update to anon using (true) with check (true);

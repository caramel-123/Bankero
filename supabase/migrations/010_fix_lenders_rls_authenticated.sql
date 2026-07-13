-- ─────────────────────────────────────────────────────────────
-- Fix: lenders RLS never covered INSERT/UPDATE for either role,
-- and even the tracked SELECT policy only names `anon` implicitly
-- ─────────────────────────────────────────────────────────────
-- Same class of bug as 007/008 fixed for `users`: lender signup/settings
-- writes have been running on whatever broad access was granted outside
-- tracked migrations. PATCH 3.7.13 adds ensureLenderProfile() (used by
-- the new lender "Continue with Google" button), which inserts a lenders
-- row under an `authenticated` session right after OAuth — if that role
-- was never covered, this fails with the same 403 the users table did.

drop policy if exists lenders_read on lenders;
drop policy if exists "read lenders" on lenders;
drop policy if exists "insert lenders" on lenders;
drop policy if exists "update lenders" on lenders;

create policy "read lenders" on lenders for select to anon, authenticated using (true);
create policy "insert lenders" on lenders for insert to anon, authenticated with check (true);
create policy "update lenders" on lenders for update to anon, authenticated using (true) with check (true);

grant select, insert, update on lenders to anon, authenticated;

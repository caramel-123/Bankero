-- ─────────────────────────────────────────────────────────────
-- Fix: loans table has no tracked SELECT/INSERT/UPDATE policy at all
-- ─────────────────────────────────────────────────────────────
-- Same class of bug as 007/008 (users) and 010 (lenders): `loans` predates
-- tracked migrations entirely (009 only added the DELETE policy for loan
-- cancellation) and has been relying on whatever ad-hoc access was granted
-- outside migrations — almost certainly anon-only, from the pre-auth,
-- wallet-connect-only era.
--
-- Borrowers now apply for loans under an `authenticated` Supabase Auth
-- session (see loanStore.ts saveLoan()), which silently fails to insert
-- if that role isn't covered — the loan appears to submit fine (it's
-- optimistically cached locally) but never reaches Supabase, so it never
-- shows up on the lender's dashboard, which reads Supabase directly with
-- no local-cache fallback.

drop policy if exists "read loans" on loans;
drop policy if exists "insert loans" on loans;
drop policy if exists "update loans" on loans;

create policy "read loans" on loans for select to anon, authenticated using (true);
create policy "insert loans" on loans for insert to anon, authenticated with check (true);
create policy "update loans" on loans for update to anon, authenticated using (true) with check (true);

grant select, insert, update on loans to anon, authenticated;

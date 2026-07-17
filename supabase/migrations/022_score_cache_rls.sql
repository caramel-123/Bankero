-- ─────────────────────────────────────────────────────────────
-- Fix: score_cache table has no tracked SELECT/INSERT/UPDATE policy at all
-- ─────────────────────────────────────────────────────────────
-- Same class of bug as 007/008 (users), 010 (lenders), and 011 (loans):
-- `score_cache` predates tracked migrations entirely and has been relying
-- on whatever ad-hoc access was granted outside migrations. Confirmed via
-- a real error: 403, code 42501, "new row violates row-level security
-- policy for table 'score_cache'" — every upsert into this table
-- (loanStore.ts's persistScore, and the tx_score bonus writers in
-- savingsBank.ts/savingsTracker.ts/paluwaganScoring.ts) has been silently
-- failing for any wallet whose row didn't already exist under whatever
-- narrower access was previously in place.

drop policy if exists "read score_cache" on score_cache;
drop policy if exists "insert score_cache" on score_cache;
drop policy if exists "update score_cache" on score_cache;

create policy "read score_cache" on score_cache for select to anon, authenticated using (true);
create policy "insert score_cache" on score_cache for insert to anon, authenticated with check (true);
create policy "update score_cache" on score_cache for update to anon, authenticated using (true) with check (true);

grant select, insert, update on score_cache to anon, authenticated;

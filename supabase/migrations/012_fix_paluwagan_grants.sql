-- ─────────────────────────────────────────────────────────────
-- Fix: paluwagan tables have permissive RLS policies but were
-- never actually GRANTed to anon/authenticated
-- ─────────────────────────────────────────────────────────────
-- 004_paluwagan.sql's insert/update policies use `with check (true)` /
-- `using (true)` with no `to` clause, which is permissive at the RLS
-- layer — but RLS is only evaluated *after* Postgres checks table-level
-- privileges. That migration never ran a GRANT for these tables, so
-- both anon and authenticated writes were blocked before RLS even had
-- a chance to allow them — same root cause as the users/lenders/loans
-- fixes earlier, just one layer lower (missing GRANT vs. missing/wrong
-- RLS policy).

grant select, insert, update on paluwagan_groups        to anon, authenticated;
grant select, insert, update on paluwagan_members        to anon, authenticated;
grant select, insert        on paluwagan_contributions   to anon, authenticated;
grant select, insert        on paluwagan_pot_releases     to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Allow removing an Active (Disbursed) loan stuck with an orphaned
-- on-chain reference, not just Pending/Approved ones
-- ─────────────────────────────────────────────────────────────
-- 009_loan_cancel.sql's DELETE policy only allowed removing a loan while
-- status was 'Pending' or 'Approved'. That matched the app's UI at the
-- time, but a savings-backed loan whose on-chain loan_registry contract
-- gets redeployed can end up permanently Disbursed and un-repayable
-- (its on-chain loan ID no longer resolves), with no way to clear it —
-- the frontend's Remove button was widened to cover this case, but the
-- delete was silently no-op'ing (Postgres RLS filters non-matching rows
-- out of a DELETE without raising an error, so the app had no idea it
-- failed). Widening the policy to match.

drop policy if exists "delete loans" on loans;

create policy "delete loans" on loans for delete to anon, authenticated
  using (status in ('Pending', 'Approved', 'Disbursed'));

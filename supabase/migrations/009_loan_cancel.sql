-- ─────────────────────────────────────────────────────────────
-- Allow borrowers to cancel a loan before it's disbursed
-- ─────────────────────────────────────────────────────────────
-- PATCH 2.7.13: borrowers can remove a loan application they no longer
-- want, or one applied for with the wrong amount — but only while it's
-- still Pending or Approved. Once a lender disburses funds the loan is
-- real debt and must go through repay/default, not deletion.
--
-- `loans` itself predates tracked migrations (created ad hoc, like
-- `users` before 007/008), so this only adds the missing DELETE policy
-- rather than recreating the table.

drop policy if exists "delete loans" on loans;

create policy "delete loans" on loans for delete to anon, authenticated
  using (status in ('Pending', 'Approved'));

grant delete on loans to anon, authenticated;

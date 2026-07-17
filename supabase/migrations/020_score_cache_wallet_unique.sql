-- ─────────────────────────────────────────────────────────────
-- Add the missing unique constraint on score_cache.wallet_address
-- ─────────────────────────────────────────────────────────────
-- `score_cache` predates tracked migrations (created ad hoc, like `loans`
-- before 009/011), so it never got a unique constraint on wallet_address.
-- Every upsert(..., { onConflict: 'wallet_address' }) call against it —
-- loanStore.ts's persistScore, savingsBank.ts's/savingsTracker.ts's/
-- paluwaganScoring.ts's tx_score bonuses — has been failing with a 400
-- ("there is no unique or exclusion constraint matching the ON CONFLICT
-- specification") the entire time, silently for callers that didn't check
-- the error. tx_score is the only field with no other source to fall back
-- on, which is why it was the one that visibly never moved.

DO $$
BEGIN
  ALTER TABLE score_cache ADD CONSTRAINT score_cache_wallet_address_key UNIQUE (wallet_address);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'score_cache_wallet_address_key already exists, skipping';
END $$;

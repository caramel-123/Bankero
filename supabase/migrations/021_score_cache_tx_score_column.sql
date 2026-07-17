-- ─────────────────────────────────────────────────────────────
-- Add the missing tx_score column to score_cache
-- ─────────────────────────────────────────────────────────────
-- Confirmed via a real PostgREST error: PGRST204 "Could not find the
-- 'tx_score' column of 'score_cache' in the schema cache". savingsBank.ts,
-- savingsTracker.ts, and paluwaganScoring.ts have all been writing (or
-- trying to write) a tx_score bonus into this table since those features
-- were built, but the column was never actually added to the live table —
-- score_cache predates tracked migrations, so nothing ever ran the ALTER
-- TABLE for it. Every one of those writes has been failing with this same
-- error the entire time, in addition to 020's missing-unique-constraint
-- issue on the same upsert calls.

alter table score_cache add column if not exists tx_score integer not null default 0 check (tx_score between 0 and 100);

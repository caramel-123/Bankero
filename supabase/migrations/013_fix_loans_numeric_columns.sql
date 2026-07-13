-- ─────────────────────────────────────────────────────────────
-- Fix: loans.amount/interest/total are integer columns, but XLM
-- loan amounts are fractional (e.g. 10 XLM × 5% = 0.5 XLM interest)
-- ─────────────────────────────────────────────────────────────
-- Same "created outside tracked migrations" situation as `users` and
-- `lenders` before them — these columns were sized for whole-peso
-- amounts. Now that loan amounts/interest are denominated in XLM
-- (see the peso->XLM conversion), non-whole values are common and
-- every application with a non-integer interest amount fails with
-- "invalid input syntax for type integer".

alter table loans alter column amount   type numeric using amount::numeric;
alter table loans alter column interest type numeric using interest::numeric;
alter table loans alter column total    type numeric using total::numeric;

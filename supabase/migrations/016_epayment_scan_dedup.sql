-- ─────────────────────────────────────────────────────────────
-- Prevent replaying the same e-payment receipt for repeat score bonuses
-- ─────────────────────────────────────────────────────────────
-- The app already checked extracted_reference for duplicates before
-- inserting, but that was a check-then-insert with no atomic backstop
-- (a race between two near-simultaneous submissions of the same
-- receipt could both pass the check before either row exists), and it
-- only caught a duplicate if the AI read the exact same reference
-- number both times. Adding a content hash of the image itself catches
-- a literal re-upload of the same screenshot regardless of OCR
-- consistency, and both columns get real unique constraints so
-- Postgres — not just application code — rejects the second insert.

alter table epayment_scans add column if not exists image_hash text;

create unique index if not exists epayment_scans_image_hash_uidx
  on epayment_scans(image_hash) where image_hash is not null;

create unique index if not exists epayment_scans_reference_uidx
  on epayment_scans(extracted_reference) where extracted_reference is not null;

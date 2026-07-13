-- ─────────────────────────────────────────────────────────────
-- Clean up pre-existing duplicate epayment_scans rows before 016's
-- unique index can be created
-- ─────────────────────────────────────────────────────────────
-- Repeated testing (while debugging the AI verifier provider) inserted
-- several scans with the same extracted_reference before the dedup
-- constraint existed, which makes create unique index fail with
-- "could not create unique index ... is duplicated". Keep the oldest
-- row per duplicated reference/hash and drop the rest, then (re)create
-- the indexes from 016.

-- (created_at, id) tuple comparison breaks ties when two rows share
-- the exact same timestamp, guaranteeing exactly one survivor per
-- duplicated value instead of possibly deleting neither.
delete from epayment_scans a
using epayment_scans b
where a.extracted_reference is not null
  and a.extracted_reference = b.extracted_reference
  and (a.created_at, a.id) > (b.created_at, b.id);

delete from epayment_scans a
using epayment_scans b
where a.image_hash is not null
  and a.image_hash = b.image_hash
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index if not exists epayment_scans_image_hash_uidx
  on epayment_scans(image_hash) where image_hash is not null;

create unique index if not exists epayment_scans_reference_uidx
  on epayment_scans(extracted_reference) where extracted_reference is not null;

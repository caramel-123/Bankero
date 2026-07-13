-- ─────────────────────────────────────────────────────────────
-- Fix: the "bankero-epayment-scans" Storage bucket used by the Scan
-- E-Payment feature (services/epaymentScan.ts uploadEpaymentImage())
-- was never actually created
-- ─────────────────────────────────────────────────────────────
-- 006_auth_and_scan.sql added the epayment_scans *table* and its RLS,
-- but the image upload happens against Supabase Storage, a separate
-- system (storage.buckets / storage.objects) that was never touched by
-- any migration or manual setup step. Storage defaults to deny-all
-- until a bucket exists and storage.objects has explicit policies for
-- it — same "nothing works until you explicitly grant it" shape as
-- every RLS fix so far this project, just in the Storage system
-- instead of a public-schema table.

insert into storage.buckets (id, name, public)
values ('bankero-epayment-scans', 'bankero-epayment-scans', true)
on conflict (id) do nothing;

drop policy if exists "read bankero-epayment-scans"   on storage.objects;
drop policy if exists "upload bankero-epayment-scans" on storage.objects;

create policy "read bankero-epayment-scans"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'bankero-epayment-scans');

create policy "upload bankero-epayment-scans"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'bankero-epayment-scans');

-- The epayment_scans table itself has the same anon-only gap as
-- savings_bank_transactions/savings_streaks/weekly_deposits did before
-- migration 014 — recordEpaymentScan()'s insert (the last step of the
-- scan flow, after the image upload) would fail the same way for a
-- logged-in borrower.

drop policy if exists "anon read epayment_scans"   on epayment_scans;
drop policy if exists "anon insert epayment_scans" on epayment_scans;
drop policy if exists "anon update epayment_scans" on epayment_scans;
drop policy if exists "read epayment_scans"         on epayment_scans;
drop policy if exists "insert epayment_scans"       on epayment_scans;
drop policy if exists "update epayment_scans"       on epayment_scans;

create policy "read epayment_scans"   on epayment_scans for select to anon, authenticated using (true);
create policy "insert epayment_scans" on epayment_scans for insert to anon, authenticated with check (true);
create policy "update epayment_scans" on epayment_scans for update to anon, authenticated using (true) with check (true);

grant select, insert, update on epayment_scans to anon, authenticated;

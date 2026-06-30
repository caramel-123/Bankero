-- Feature: User Feedback & Testimonials

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  wallet_address text,          -- null for guests
  rating integer not null check (rating between 1 and 5),
  message text not null,
  is_guest boolean default false,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "anyone can read feedback"
  on feedback for select using (true);

create policy "anyone can insert feedback"
  on feedback for insert with check (true);

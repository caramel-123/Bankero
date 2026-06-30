-- ============================================================
-- Migration 004: On-Chain Community Paluwagan
-- ============================================================

-- Paluwagan groups metadata (mirrors on-chain state)
create table if not exists paluwagan_groups (
  id uuid primary key default gen_random_uuid(),
  group_id_onchain integer not null unique,
  organizer_id uuid references users(id),
  group_name text not null,
  contribution_amount_xlm numeric not null,
  cycle_frequency text not null check (cycle_frequency in ('weekly', 'monthly')),
  total_cycles integer not null,
  current_cycle integer default 1,
  status text default 'active' check (status in ('active', 'completed', 'defaulted')),
  stellar_contract_id text,
  created_at timestamptz default now(),
  next_deadline timestamptz
);

-- Group membership
create table if not exists paluwagan_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references paluwagan_groups(id) on delete cascade,
  user_id uuid references users(id),
  stellar_address text not null,
  rotation_order integer not null,
  is_active boolean default true,
  consecutive_misses integer default 0,
  total_contributions integer default 0,
  joined_at timestamptz default now(),
  unique(group_id, user_id),
  unique(group_id, rotation_order)
);

-- Individual contribution records per cycle
create table if not exists paluwagan_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references paluwagan_groups(id),
  user_id uuid references users(id),
  cycle_number integer not null,
  amount_xlm numeric not null,
  tx_hash text not null,
  contributed_at timestamptz default now(),
  was_on_time boolean default true,
  score_bonus_applied integer default 0,
  unique(group_id, user_id, cycle_number)
);

-- Pot releases per cycle
create table if not exists paluwagan_pot_releases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references paluwagan_groups(id),
  cycle_number integer not null,
  recipient_user_id uuid references users(id),
  total_amount_xlm numeric not null,
  tx_hash text not null,
  released_at timestamptz default now(),
  unique(group_id, cycle_number)
);

-- ── RLS ──────────────────────────────────────────────────────

alter table paluwagan_groups enable row level security;
alter table paluwagan_members enable row level security;
alter table paluwagan_contributions enable row level security;
alter table paluwagan_pot_releases enable row level security;

-- Groups: visible to members, insertable by anyone (anon for demo/guest)
create policy "members can view their groups"
  on paluwagan_groups for select
  using (
    exists (
      select 1 from paluwagan_members
      where paluwagan_members.group_id = paluwagan_groups.id
      and paluwagan_members.user_id = auth.uid()
    )
  );

create policy "anon can insert groups"
  on paluwagan_groups for insert
  with check (true);

create policy "anon can update groups"
  on paluwagan_groups for update
  using (true);

-- Members
create policy "users can view own membership"
  on paluwagan_members for select
  using (user_id = auth.uid());

create policy "anon can insert members"
  on paluwagan_members for insert
  with check (true);

create policy "anon can update members"
  on paluwagan_members for update
  using (true);

-- Contributions
create policy "users can view own contributions"
  on paluwagan_contributions for select
  using (user_id = auth.uid());

create policy "anon can insert contributions"
  on paluwagan_contributions for insert
  with check (true);

-- Pot releases
create policy "members can view pot releases"
  on paluwagan_pot_releases for select
  using (
    exists (
      select 1 from paluwagan_members
      where paluwagan_members.group_id = paluwagan_pot_releases.group_id
      and paluwagan_members.user_id = auth.uid()
    )
  );

create policy "anon can insert pot releases"
  on paluwagan_pot_releases for insert
  with check (true);

-- Feature migration: poke/gift/emote interactions between profiles

create table if not exists public.profile_interactions (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('poke', 'gift', 'emote')),
  emoji text,
  label text,
  token_cost integer not null default 0 check (token_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists profile_interactions_to_profile_idx
  on public.profile_interactions (to_profile_id, created_at desc);

create index if not exists profile_interactions_from_profile_idx
  on public.profile_interactions (from_profile_id, created_at desc);

alter table public.profile_interactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_interactions'
      and policyname = 'Public read profile interactions'
  ) then
    create policy "Public read profile interactions"
      on public.profile_interactions
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_interactions'
      and policyname = 'Public insert profile interactions'
  ) then
    create policy "Public insert profile interactions"
      on public.profile_interactions
      for insert
      with check (true);
  end if;
end $$;

-- =============================================================
-- PROFILE VIEWS - migration for notification center
-- Run in: Supabase > SQL Editor
-- =============================================================

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Prevent accidental self-view rows.
  constraint profile_views_not_self check (viewer_profile_id <> viewed_profile_id)
);

create index if not exists idx_profile_views_viewed_created
  on public.profile_views (viewed_profile_id, created_at desc);

create index if not exists idx_profile_views_viewer_created
  on public.profile_views (viewer_profile_id, created_at desc);

alter table public.profile_views enable row level security;

drop policy if exists "Public read profile views" on public.profile_views;
create policy "Public read profile views"
  on public.profile_views
  for select
  using (true);

drop policy if exists "Public insert profile views" on public.profile_views;
create policy "Public insert profile views"
  on public.profile_views
  for insert
  with check (true);

-- Admin popularity override: lets admins manually force a profile to show
-- the "popular" card style (gold frame + lightning badge) for testing.
-- Run in Supabase SQL editor.

alter table public.profiles
  add column if not exists is_popular_override boolean not null default false;

create index if not exists profiles_popular_override_idx
  on public.profiles(id)
  where is_popular_override = true;

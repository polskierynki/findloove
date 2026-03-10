-- =============================================================
-- PROFILE PHOTO COMMENTS
-- =============================================================
-- Umozliwia komentarze do konkretnych zdjec profilu.
-- photo_index = 0 oznacza zdjecie glowne.

create table if not exists public.profile_photo_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  photo_index integer not null default 0 check (photo_index >= 0),
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists profile_photo_comments_profile_photo_created_idx
  on public.profile_photo_comments (profile_id, photo_index, created_at desc);

alter table public.profile_photo_comments enable row level security;

drop policy if exists "Public read profile photo comments" on public.profile_photo_comments;
create policy "Public read profile photo comments"
  on public.profile_photo_comments
  for select
  using (true);

drop policy if exists "Public insert profile photo comments" on public.profile_photo_comments;
create policy "Public insert profile photo comments"
  on public.profile_photo_comments
  for insert
  with check (true);

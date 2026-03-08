-- Fix photo upload pipeline for Supabase
-- 1) Repairs public.profile_photos schema used by lib/photoUpload.ts
-- 2) Ensures RLS policies allow users to manage only their own photos
-- 3) Creates/updates storage bucket + policies for profile-photos

begin;

create extension if not exists pgcrypto;

-- Ensure table exists with expected structure
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Backfill missing columns from older schema versions
alter table public.profile_photos add column if not exists id uuid;
alter table public.profile_photos add column if not exists url text;
alter table public.profile_photos add column if not exists is_main boolean default false;
alter table public.profile_photos add column if not exists sort_order integer default 0;
alter table public.profile_photos add column if not exists created_at timestamptz default now();

update public.profile_photos
set id = gen_random_uuid()
where id is null;

update public.profile_photos
set is_main = false
where is_main is null;

update public.profile_photos
set sort_order = 0
where sort_order is null;

update public.profile_photos pp
set url = coalesce(
  nullif(trim(pp.url), ''),
  p.image_url,
  'https://ui-avatars.com/api/?name=User&background=e2e8f0&color=475569&size=256'
)
from public.profiles p
where pp.profile_id = p.id
  and (pp.url is null or trim(pp.url) = '');

update public.profile_photos
set url = 'https://ui-avatars.com/api/?name=User&background=e2e8f0&color=475569&size=256'
where url is null or trim(url) = '';

-- Ensure constraints/indexes
alter table public.profile_photos alter column id set default gen_random_uuid();
alter table public.profile_photos alter column profile_id set not null;
alter table public.profile_photos alter column url set not null;
alter table public.profile_photos alter column is_main set default false;
alter table public.profile_photos alter column is_main set not null;
alter table public.profile_photos alter column sort_order set default 0;
alter table public.profile_photos alter column sort_order set not null;
alter table public.profile_photos alter column created_at set default now();
alter table public.profile_photos alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profile_photos'::regclass
      and contype = 'p'
  ) then
    alter table public.profile_photos add constraint profile_photos_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_photos_profile_id_fkey'
      and conrelid = 'public.profile_photos'::regclass
  ) then
    alter table public.profile_photos
      add constraint profile_photos_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists profile_photos_profile_sort_idx
  on public.profile_photos (profile_id, sort_order, created_at desc);

create unique index if not exists profile_photos_one_main_idx
  on public.profile_photos (profile_id)
  where is_main;

-- Table RLS policies
alter table public.profile_photos enable row level security;

drop policy if exists "Public read photos" on public.profile_photos;
create policy "Public read photos"
  on public.profile_photos
  for select
  using (true);

drop policy if exists "Users can insert own photos" on public.profile_photos;
create policy "Users can insert own photos"
  on public.profile_photos
  for insert
  with check (auth.uid() = profile_id);

drop policy if exists "Users can update own photos" on public.profile_photos;
create policy "Users can update own photos"
  on public.profile_photos
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Users can delete own photos" on public.profile_photos;
create policy "Users can delete own photos"
  on public.profile_photos
  for delete
  using (auth.uid() = profile_id);

-- Storage bucket for files uploaded by uploadProfilePhoto()
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies for bucket profile-photos
-- Path pattern used in app: profiles/<auth.uid()>/<timestamp>.<ext>
drop policy if exists "Profile photos public read" on storage.objects;
create policy "Profile photos public read"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

drop policy if exists "Profile photos upload own folder" on storage.objects;
create policy "Profile photos upload own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Profile photos update own folder" on storage.objects;
create policy "Profile photos update own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Profile photos delete own folder" on storage.objects;
create policy "Profile photos delete own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;
